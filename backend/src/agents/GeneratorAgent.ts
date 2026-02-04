import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { RTLAgentData } from "./RTLAgent";
import { ArchitectureAgentData } from "./ArchitectureAgent";
import { SpecificationAgentData } from "./SpecificationAgent";
import {
  fillTemplateFromFile,
  fillTemplate,
  toUpperSnakeCase,
  cleanEmptyPlaceholders,
} from "../utils/templateEngine";
import {
  generateInterfaceName,
  generateTransactionTypeName,
} from "../utils/namingConvention";
import {
  generateAgentCovergroups,
  generateDefaultCoverageGoals,
  extractCoverageGoals,
} from "../utils/coverageGenerator";
import {
  generateScoreboardCode,
  generateTimingToleranceCode,
  generateErrorLoggingCode,
} from "../utils/scoreboardGenerator";
import {
  generateResetSequenceCode,
  generateResetConnections,
  generateResetInterfaceConnections,
} from "../utils/resetGenerator";
import {
  generateComponentFactoryRegistration,
  determineComponentType,
} from "../utils/factoryGenerator";
import {
  getGenerationModeFeatures,
  type GenerationMode,
} from "../utils/generationModeConfig";
import logger from "../config/logger";

/**
 * Generated file information
 */
export interface GeneratedFile {
  path: string;
  content: string;
  type:
    | "interface"
    | "driver"
    | "monitor"
    | "sequencer"
    | "agent"
    | "env"
    | "scoreboard"
    | "transaction"
    | "top"
    | "package";
}

/**
 * File structure information
 */
export interface FileStructure {
  directories: string[];
  files: Array<{
    path: string;
    type: string;
    dependencies: string[];
  }>;
}

/**
 * Generator Agent input
 */
export interface GeneratorAgentInput extends AgentInput {
  architectureData: ArchitectureAgentData;
  rtlData: RTLAgentData;
  specificationData?: SpecificationAgentData;
  generationMode?: "mvp" | "production" | "advanced";
}

/**
 * Generator Agent output data
 */
export interface GeneratorAgentData {
  generatedFiles: GeneratedFile[];
  fileStructure: FileStructure;
}

/**
 * UVM Component Generator Agent
 *
 * Generates UVM component code by:
 * - Selecting appropriate templates (protocol-specific vs generic)
 * - Instantiating templates with project data
 * - Using LLM for protocol-specific logic refinement
 * - Adding UVM factory registration macros
 * - Generating config_db set/get calls
 *
 * Requirements: 7.1-7.6, 23.1-23.5, 29.1-29.5
 */
export class GeneratorAgent extends BaseAgent {
  constructor() {
    super("Generator Agent");
  }

  /**
   * Execute code generation
   */
  public async execute(input: GeneratorAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting code generation...");

      // Validate input data
      if (!input.architectureData) {
        throw new Error("Architecture data is required");
      }
      if (!input.rtlData) {
        throw new Error("RTL data is required");
      }

      // Get generation mode features
      const mode = input.generationMode || "production";
      const features = getGenerationModeFeatures(mode);

      this.sendProgress(
        "in_progress",
        `Generating UVM components (${mode} mode)...`,
        {
          mode,
          agents: input.architectureData.agents.length,
          interfaces: input.architectureData.virtualInterfaces.length,
        },
      );

      const generatedFiles: GeneratedFile[] = [];

      // Filter agents based on mode
      let agentsToGenerate = input.architectureData.agents;
      if (!features.multiAgent && agentsToGenerate.length > 0) {
        // MVP mode: only generate first agent
        agentsToGenerate = [agentsToGenerate[0]];
        this.sendProgress(
          "in_progress",
          "MVP mode: Generating single agent only",
        );
      }

      // Filter passive agents if not supported
      if (!features.passiveAgents) {
        agentsToGenerate = agentsToGenerate.filter((a) => a.type === "active");
      }

      // Generate transactions
      this.sendProgress("in_progress", "Generating transaction classes...");
      for (const agent of agentsToGenerate) {
        const transactionFile = await this.generateTransaction(
          agent.name,
          input.rtlData,
        );
        generatedFiles.push(transactionFile);
      }

      // Generate interfaces
      this.sendProgress("in_progress", "Generating interfaces...");
      for (const vif of input.architectureData.virtualInterfaces) {
        const interfaceFile = await this.generateInterface(vif, input.rtlData);
        generatedFiles.push(interfaceFile);
      }

      // Generate drivers
      this.sendProgress("in_progress", "Generating drivers...");
      for (const agent of agentsToGenerate) {
        if (agent.type === "active" && agent.components.driver) {
          const driverFile = await this.generateDriver(
            agent,
            input.architectureData,
            input.rtlData,
          );
          generatedFiles.push(driverFile);
        }
      }

      // Generate monitors
      this.sendProgress("in_progress", "Generating monitors...");
      for (const agent of agentsToGenerate) {
        const monitorFile = await this.generateMonitor(
          agent,
          input.architectureData,
          input.rtlData,
          features.coverage ? input.specificationData : undefined,
        );
        generatedFiles.push(monitorFile);
      }

      // Generate sequencers
      this.sendProgress("in_progress", "Generating sequencers...");
      for (const agent of agentsToGenerate) {
        if (agent.type === "active" && agent.components.sequencer) {
          const sequencerFile = await this.generateSequencer(agent);
          generatedFiles.push(sequencerFile);
        }
      }

      // Generate agents
      this.sendProgress("in_progress", "Generating agents...");
      for (const agent of agentsToGenerate) {
        const agentFile = await this.generateAgent(agent);
        generatedFiles.push(agentFile);
      }

      // Generate environment
      this.sendProgress("in_progress", "Generating environment...");
      const envFile = await this.generateEnvironment(
        input.architectureData,
        input.rtlData,
        agentsToGenerate,
        features.scoreboard,
      );
      generatedFiles.push(envFile);

      // Generate scoreboard (if enabled)
      if (features.scoreboard) {
        this.sendProgress("in_progress", "Generating scoreboard...");
        const scoreboardFile = await this.generateScoreboard(
          input.architectureData,
          input.rtlData,
        );
        generatedFiles.push(scoreboardFile);
      }

      // Generate tb_top
      this.sendProgress("in_progress", "Generating testbench top module...");
      const tbTopFile = await this.generateTbTop(
        input.architectureData,
        input.rtlData,
      );
      generatedFiles.push(tbTopFile);

      // Generate file structure
      const fileStructure = this.generateFileStructure(generatedFiles);

      const data: GeneratorAgentData = {
        generatedFiles,
        fileStructure,
      };

      this.sendProgress("completed", "Code generation complete", {
        filesGenerated: generatedFiles.length,
        directories: fileStructure.directories.length,
        mode,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Generator Agent failed:`, error);
      this.sendProgress("failed", `Generation failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Generate transaction class
   */
  private async generateTransaction(
    agentName: string,
    rtlData: RTLAgentData,
  ): Promise<GeneratedFile> {
    const transactionName = generateTransactionTypeName(agentName);
    const baseName = agentName.replace("_agent", "");

    // Get relevant signals for this agent
    const agentSignals = rtlData.ports.filter((p) =>
      p.name.toLowerCase().includes(baseName.toLowerCase()),
    );

    // Generate field declarations
    const fieldDeclarations = agentSignals
      .map((port) => {
        const width = port.width || "1";
        if (width === "1") {
          return `  rand bit ${port.name};`;
        } else {
          return `  rand bit [${parseInt(width) - 1}:0] ${port.name};`;
        }
      })
      .join("\n");

    // Generate field utils
    const fieldUtils = agentSignals
      .map((port) => `    \`uvm_field_int(${port.name}, UVM_DEFAULT)`)
      .join("\n");

    // Generate convert2string logic
    const convert2stringLogic = agentSignals
      .map(
        (port) =>
          `    s = {s, $sformatf("  ${port.name} = 0x%0h\\n", ${port.name})};`,
      )
      .join("\n");

    // Generate do_copy logic
    const doCopyLogic = agentSignals
      .map((port) => `    this.${port.name} = rhs_.${port.name};`)
      .join("\n");

    // Generate do_compare logic
    const doCompareLogic = agentSignals
      .map((port) => `&& (this.${port.name} == rhs_.${port.name})`)
      .join(" ");

    // Generate factory registration
    const factoryRegistration = generateComponentFactoryRegistration(
      transactionName,
      "uvm_sequence_item",
    );

    const templateData = {
      TRANSACTION_NAME: transactionName,
      TRANSACTION_NAME_UPPER: toUpperSnakeCase(transactionName),
      AGENT_NAME: agentName,
      FIELD_DECLARATIONS: fieldDeclarations || "  // No fields",
      FIELD_UTILS: fieldUtils || "    // No fields",
      CONSTRAINTS: "  // Add constraints here",
      CONVERT2STRING_LOGIC: convert2stringLogic || "    // No fields",
      DO_COPY_LOGIC: doCopyLogic || "    // No fields",
      DO_COMPARE_LOGIC: doCompareLogic || "",
      FACTORY_REGISTRATION: factoryRegistration,
    };

    const content = await fillTemplateFromFile(
      "uvm/transaction.sv.template",
      templateData,
    );

    return {
      path: `transactions/${transactionName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "transaction",
    };
  }

  /**
   * Generate interface
   */
  private async generateInterface(
    vif: any,
    rtlData: RTLAgentData,
  ): Promise<GeneratedFile> {
    const clockSignal =
      rtlData.clockSignals.length > 0 ? rtlData.clockSignals[0].name : "clk";
    const resetSignals =
      rtlData.resetSignals.length > 0
        ? `,\n  input logic ${rtlData.resetSignals[0].name}`
        : "";

    // Generate signal declarations
    const signalDeclarations = vif.signals
      .map((sig: string) => {
        const port = rtlData.ports.find((p) => p.name === sig);
        if (!port) return `  logic ${sig};`;

        const width = port.width || "1";
        if (width === "1") {
          return `  logic ${sig};`;
        } else {
          return `  logic [${parseInt(width) - 1}:0] ${sig};`;
        }
      })
      .join("\n");

    // Generate driver signals
    const driverSignals = vif.signals
      .map((sig: string) => {
        const port = rtlData.ports.find((p) => p.name === sig);
        if (port && port.direction === "input") {
          return `    output ${sig}`;
        }
        return null;
      })
      .filter(Boolean)
      .join(",\n");

    // Generate monitor signals
    const monitorSignals = vif.signals
      .map((sig: string) => `    input ${sig}`)
      .join(",\n");

    const templateData = {
      INTERFACE_NAME: vif.name,
      INTERFACE_NAME_UPPER: toUpperSnakeCase(vif.name),
      AGENT_NAME: vif.name.replace("_if", ""),
      CLOCK_SIGNAL: clockSignal,
      RESET_SIGNALS: resetSignals,
      SIGNAL_DECLARATIONS: signalDeclarations,
      DRIVER_SIGNALS: driverSignals || "    // No driver signals",
      MONITOR_SIGNALS: monitorSignals,
    };

    const content = await fillTemplateFromFile(
      "uvm/interface.sv.template",
      templateData,
    );

    return {
      path: `interfaces/${vif.name}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "interface",
    };
  }

  /**
   * Generate driver
   */
  private async generateDriver(
    agent: any,
    architectureData: ArchitectureAgentData,
    rtlData: RTLAgentData,
  ): Promise<GeneratedFile> {
    const driverName = agent.components.driver;
    const interfaceName = generateInterfaceName(agent.name);
    const transactionType = generateTransactionTypeName(agent.name);

    // Generate reset wait logic
    const resetSignal =
      rtlData.resetSignals.length > 0
        ? rtlData.resetSignals[0]
        : { name: "rst_n", polarity: "active_low" };

    const resetWaitLogic =
      resetSignal.polarity === "active_low"
        ? `@(posedge vif.${resetSignal.name});`
        : `@(negedge vif.${resetSignal.name});`;

    // Placeholder for drive logic (will be enhanced by LLM or protocol-specific)
    const driveLogic = `// TODO: Implement protocol-specific driving logic
    @(vif.driver_cb);
    // Drive signals based on transaction fields`;

    const templateData = {
      COMPONENT_NAME: driverName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(driverName),
      AGENT_NAME: agent.name,
      INTERFACE_NAME: interfaceName,
      TRANSACTION_TYPE: transactionType,
      RESET_WAIT_LOGIC: resetWaitLogic,
      DRIVE_LOGIC: driveLogic,
    };

    const content = await fillTemplateFromFile(
      "uvm/driver.sv.template",
      templateData,
    );

    return {
      path: `agents/${agent.name}/${driverName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "driver",
    };
  }

  /**
   * Generate monitor
   */
  private async generateMonitor(
    agent: any,
    architectureData: ArchitectureAgentData,
    rtlData: RTLAgentData,
    specificationData?: any,
  ): Promise<GeneratedFile> {
    const monitorName = agent.components.monitor;
    const interfaceName = generateInterfaceName(agent.name);
    const transactionType = generateTransactionTypeName(agent.name);

    // Generate reset wait logic
    const resetSignal =
      rtlData.resetSignals.length > 0
        ? rtlData.resetSignals[0]
        : { name: "rst_n", polarity: "active_low" };

    const resetWaitLogic =
      resetSignal.polarity === "active_low"
        ? `@(posedge vif.${resetSignal.name});`
        : `@(negedge vif.${resetSignal.name});`;

    // Placeholder for collect logic
    const collectLogic = `// TODO: Implement protocol-specific collection logic
    @(vif.monitor_cb);
    // Sample signals and populate transaction`;

    // Generate coverage model
    let coverageCollector = "";
    let coverageBuild = "";
    let coverageSample = "";

    // Extract coverage goals from specification or use defaults
    const coverageGoals = specificationData
      ? extractCoverageGoals(specificationData, agent.name)
      : [];

    // Get signals for this agent
    const agentSignals = rtlData.ports
      .filter((p) =>
        p.name
          .toLowerCase()
          .includes(agent.name.replace("_agent", "").toLowerCase()),
      )
      .map((p) => p.name);

    // Use extracted goals or generate default coverage
    const goals =
      coverageGoals.length > 0
        ? coverageGoals
        : generateDefaultCoverageGoals(agentSignals, agent.name);

    if (goals.length > 0) {
      const coverage = generateAgentCovergroups(
        goals,
        transactionType,
        agent.name,
      );

      coverageCollector = coverage.declarations;
      coverageBuild = coverage.instantiations;
      coverageSample = coverage.samplings;
    }

    const templateData = {
      COMPONENT_NAME: monitorName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(monitorName),
      AGENT_NAME: agent.name,
      INTERFACE_NAME: interfaceName,
      TRANSACTION_TYPE: transactionType,
      RESET_WAIT_LOGIC: resetWaitLogic,
      COLLECT_LOGIC: collectLogic,
      COVERAGE_COLLECTOR: coverageCollector || "// No coverage defined",
      COVERAGE_BUILD: coverageBuild || "// No coverage to build",
      COVERAGE_SAMPLE: coverageSample || "// No coverage to sample",
    };

    const content = await fillTemplateFromFile(
      "uvm/monitor.sv.template",
      templateData,
    );

    return {
      path: `agents/${agent.name}/${monitorName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "monitor",
    };
  }

  /**
   * Generate sequencer
   */
  private async generateSequencer(agent: any): Promise<GeneratedFile> {
    const sequencerName = agent.components.sequencer;
    const transactionType = generateTransactionTypeName(agent.name);

    const templateData = {
      COMPONENT_NAME: sequencerName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(sequencerName),
      AGENT_NAME: agent.name,
      TRANSACTION_TYPE: transactionType,
    };

    const content = await fillTemplateFromFile(
      "uvm/sequencer.sv.template",
      templateData,
    );

    return {
      path: `agents/${agent.name}/${sequencerName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "sequencer",
    };
  }

  /**
   * Generate agent
   */
  private async generateAgent(agent: any): Promise<GeneratedFile> {
    const agentName = agent.components.agent;
    const isActive = agent.type === "active" ? "UVM_ACTIVE" : "UVM_PASSIVE";

    // Generate component declarations
    let driverDeclaration = "";
    let monitorDeclaration = "";
    let sequencerDeclaration = "";
    let driverCreate = "";
    let monitorCreate = "";
    let sequencerCreate = "";
    let driverSequencerConnect = "";

    if (agent.components.driver) {
      driverDeclaration = `  ${agent.components.driver} driver;`;
      driverCreate = `      driver = ${agent.components.driver}::type_id::create("driver", this);`;
      sequencerDeclaration = `  ${agent.components.sequencer} sequencer;`;
      sequencerCreate = `      sequencer = ${agent.components.sequencer}::type_id::create("sequencer", this);`;
      driverSequencerConnect = `      driver.seq_item_port.connect(sequencer.seq_item_export);`;
    }

    monitorDeclaration = `  ${agent.components.monitor} monitor;`;
    monitorCreate = `    monitor = ${agent.components.monitor}::type_id::create("monitor", this);`;

    const templateData = {
      COMPONENT_NAME: agentName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(agentName),
      AGENT_NAME: agent.name,
      IS_ACTIVE: isActive,
      DRIVER_DECLARATION: driverDeclaration,
      MONITOR_DECLARATION: monitorDeclaration,
      SEQUENCER_DECLARATION: sequencerDeclaration,
      DRIVER_CREATE: driverCreate,
      MONITOR_CREATE: monitorCreate,
      SEQUENCER_CREATE: sequencerCreate,
      DRIVER_SEQUENCER_CONNECT: driverSequencerConnect,
    };

    const content = await fillTemplateFromFile(
      "uvm/agent.sv.template",
      templateData,
    );

    return {
      path: `agents/${agent.name}/${agentName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "agent",
    };
  }

  /**
   * Generate environment
   */
  private async generateEnvironment(
    architectureData: ArchitectureAgentData,
    rtlData: RTLAgentData,
    agents: any[],
    includeScoreboard: boolean,
  ): Promise<GeneratedFile> {
    const envName = architectureData.environmentHierarchy.topEnv;

    // Generate agent declarations
    const agentDeclarations = agents
      .map((agent) => `  ${agent.components.agent} ${agent.name};`)
      .join("\n");

    // Generate agent creates
    const agentCreates = agents
      .map(
        (agent) =>
          `    ${agent.name} = ${agent.components.agent}::type_id::create("${agent.name}", this);`,
      )
      .join("\n");

    // Generate scoreboard declaration and create
    let scoreboardDeclaration = "";
    let scoreboardCreate = "";
    let monitorScoreboardConnects = "";

    if (includeScoreboard) {
      const scoreboardName = architectureData.environmentHierarchy.scoreboard;
      scoreboardDeclaration = `  ${scoreboardName} scoreboard;`;
      scoreboardCreate = `    scoreboard = ${scoreboardName}::type_id::create("scoreboard", this);`;

      // Generate monitor-scoreboard connections
      monitorScoreboardConnects = agents
        .map(
          (agent) =>
            `    ${agent.name}.monitor.analysis_port.connect(scoreboard.${agent.name}_export);`,
        )
        .join("\n");
    }

    const templateData = {
      COMPONENT_NAME: envName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(envName),
      DUT_NAME: rtlData.topModule,
      AGENT_DECLARATIONS: agentDeclarations,
      SCOREBOARD_DECLARATION: scoreboardDeclaration || "// No scoreboard",
      COVERAGE_DECLARATIONS: "// Coverage declarations placeholder",
      AGENT_CREATES: agentCreates,
      SCOREBOARD_CREATE: scoreboardCreate || "// No scoreboard",
      COVERAGE_CREATES: "// Coverage creates placeholder",
      MONITOR_SCOREBOARD_CONNECTS:
        monitorScoreboardConnects || "// No scoreboard connections",
      MONITOR_COVERAGE_CONNECTS: "// Coverage connects placeholder",
    };

    const content = await fillTemplateFromFile(
      "uvm/environment.sv.template",
      templateData,
    );

    return {
      path: `env/${envName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "env",
    };
  }

  /**
   * Generate scoreboard
   */
  private async generateScoreboard(
    architectureData: ArchitectureAgentData,
    rtlData: RTLAgentData,
  ): Promise<GeneratedFile> {
    const scoreboardName = architectureData.environmentHierarchy.scoreboard;

    // Build transaction type map
    const transactionTypes = new Map<string, string>();
    architectureData.agents.forEach((agent) => {
      transactionTypes.set(agent.name, generateTransactionTypeName(agent.name));
    });

    // Generate analysis imports
    const analysisImports = architectureData.agents
      .map(
        (agent) =>
          `  uvm_analysis_imp_${agent.name} #(${generateTransactionTypeName(agent.name)}, ${scoreboardName}) ${agent.name}_export;`,
      )
      .join("\n");

    // Generate analysis import creates
    const analysisImportCreates = architectureData.agents
      .map(
        (agent) =>
          `    ${agent.name}_export = new("${agent.name}_export", this);`,
      )
      .join("\n");

    // Generate scoreboard code using utility
    // TODO: Pass alignmentData to get actual scoreboard pairs
    const scoreboardPairs: any[] = [];
    const scoreboardCode = generateScoreboardCode(
      architectureData.agents,
      transactionTypes,
      scoreboardPairs,
    );

    // Generate timing tolerance and error logging
    const timingTolerance = generateTimingToleranceCode();
    const errorLogging = generateErrorLoggingCode();

    const templateData = {
      COMPONENT_NAME: scoreboardName,
      COMPONENT_NAME_UPPER: toUpperSnakeCase(scoreboardName),
      DUT_NAME: rtlData.topModule,
      ANALYSIS_IMPORTS: analysisImports,
      ANALYSIS_IMPORT_CREATES: analysisImportCreates,
      TRANSACTION_QUEUES: scoreboardCode.transactionQueues,
      WRITE_FUNCTIONS: scoreboardCode.writeFunctions,
      COMPARISON_LOGIC: scoreboardCode.comparisonLogic,
      TIMING_TOLERANCE: timingTolerance,
      ERROR_LOGGING: errorLogging,
    };

    const content = await fillTemplateFromFile(
      "uvm/scoreboard.sv.template",
      templateData,
    );

    return {
      path: `scoreboard/${scoreboardName}.sv`,
      content: cleanEmptyPlaceholders(content),
      type: "scoreboard",
    };
  }

  /**
   * Generate testbench top module
   */
  private async generateTbTop(
    architectureData: ArchitectureAgentData,
    rtlData: RTLAgentData,
  ): Promise<GeneratedFile> {
    const dutName = rtlData.topModule;
    const tbPackage = `${dutName}_pkg`;

    // Generate clock declarations
    const clockSignal =
      rtlData.clockSignals.length > 0 ? rtlData.clockSignals[0].name : "clk";
    const clockFreq =
      rtlData.clockSignals.length > 0 && rtlData.clockSignals[0].frequency
        ? rtlData.clockSignals[0].frequency
        : 100; // Default 100 MHz

    const clockPeriod = 1000 / clockFreq; // Period in ns
    const clockDeclarations = `  logic ${clockSignal};`;

    // Generate clock generation
    const clockGeneration = `
    ${clockSignal} = 0;
    forever #${clockPeriod / 2} ${clockSignal} = ~${clockSignal};`;

    // Generate reset sequence code
    const resetCode = generateResetSequenceCode(
      rtlData.resetSignals,
      clockSignal,
    );

    // Generate interface instantiations
    const interfaceInstantiations = architectureData.virtualInterfaces
      .map((vif) => {
        const resetConnections = generateResetInterfaceConnections(
          rtlData.resetSignals,
          vif.name,
        );
        return `  ${vif.name} ${vif.name}_inst (
    .${clockSignal}(${clockSignal}),
${resetConnections}
  );`;
      })
      .join("\n\n");

    // Generate DUT port connections
    const dutPortConnections = [
      `    .${clockSignal}(${clockSignal})`,
      ...rtlData.resetSignals.map((r) => `    .${r.name}(${r.name})`),
      ...architectureData.virtualInterfaces.map(
        (vif) => `    // Connect ${vif.name} signals`,
      ),
    ].join(",\n");

    // Generate config_db sets for virtual interfaces
    const configDbSets = architectureData.virtualInterfaces
      .map(
        (vif) =>
          `    uvm_config_db#(virtual ${vif.name})::set(null, "*", "vif", ${vif.name}_inst);`,
      )
      .join("\n");

    // Default timeout
    const timeout = "1000000"; // 1ms default

    const templateData = {
      DUT_NAME: dutName,
      TB_PACKAGE: tbPackage,
      CLOCK_DECLARATIONS: clockDeclarations,
      RESET_DECLARATIONS: resetCode.declarations,
      INTERFACE_INSTANTIATIONS: interfaceInstantiations,
      DUT_PORT_CONNECTIONS: dutPortConnections,
      CLOCK_GENERATION: clockGeneration,
      RESET_GENERATION: resetCode.resetTask,
      CONFIG_DB_SETS: configDbSets,
      TIMEOUT: timeout,
    };

    const content = await fillTemplateFromFile(
      "uvm/tb_top.sv.template",
      templateData,
    );

    return {
      path: "tb_top.sv",
      content: cleanEmptyPlaceholders(content),
      type: "top",
    };
  }

  /**
   * Generate file structure
   */
  private generateFileStructure(
    generatedFiles: GeneratedFile[],
  ): FileStructure {
    const directories = new Set<string>();
    const files: Array<{
      path: string;
      type: string;
      dependencies: string[];
    }> = [];

    for (const file of generatedFiles) {
      // Extract directory from path
      const dir = file.path.substring(0, file.path.lastIndexOf("/"));
      if (dir) {
        directories.add(dir);
      }

      files.push({
        path: file.path,
        type: file.type,
        dependencies: [], // TODO: Extract dependencies from content
      });
    }

    return {
      directories: Array.from(directories).sort(),
      files,
    };
  }
}

// Export singleton instance
export const generatorAgent = new GeneratorAgent();
