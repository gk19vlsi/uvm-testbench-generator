import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { fillTemplate, PROMPT_TEMPLATES } from "../prompts/templates";
import { SpecificationAgentData } from "./SpecificationAgent";
import { RTLAgentData } from "./RTLAgent";
import logger from "../config/logger";

/**
 * Agent mapping information
 */
export interface AgentMapping {
  agentName: string;
  agentType: "active" | "passive";
  protocol?: string;
  signals: string[];
  transactions: string[];
}

/**
 * Signal assignment information
 */
export interface SignalAssignment {
  signal: string;
  role: "driver" | "monitor" | "both";
  agentName: string;
}

/**
 * Scoreboard pair information
 */
export interface ScoreboardPair {
  inputSignals: string[];
  outputSignals: string[];
  checkingStrategy: "reference_model" | "transaction_comparison";
}

/**
 * Alignment Agent input
 */
export interface AlignmentAgentInput extends AgentInput {
  specificationData: SpecificationAgentData;
  rtlData: RTLAgentData;
}

/**
 * Alignment Agent output data
 */
export interface AlignmentAgentData {
  agentMappings: AgentMapping[];
  signalAssignments: SignalAssignment[];
  coverageSignals: string[];
  scoreboardPairs: ScoreboardPair[];
}

/**
 * Specification-RTL Alignment Agent
 *
 * Maps specification requirements to RTL signals by:
 * - Grouping related RTL signals into logical interfaces
 * - Mapping specification transactions to signal groups
 * - Determining agent types (active/passive) based on signal directions
 * - Assigning driver/monitor responsibilities
 * - Selecting coverage signals
 * - Identifying scoreboard input-output pairs
 *
 * Requirements: 5.1-5.5
 */
export class AlignmentAgent extends BaseAgent {
  constructor() {
    super("Alignment Agent");
  }

  /**
   * Execute alignment analysis
   */
  public async execute(input: AlignmentAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting specification-RTL alignment...");

      // Validate input data
      if (!input.specificationData) {
        throw new Error("Specification data is required");
      }
      if (!input.rtlData) {
        throw new Error("RTL data is required");
      }

      this.sendProgress(
        "in_progress",
        "Analyzing specification and RTL data...",
        {
          protocols: input.specificationData.protocols.length,
          transactions: input.specificationData.transactions.length,
          rtlPorts: input.rtlData.ports.length,
        },
      );

      // Perform signal grouping
      const signalGroups = this.groupSignals(
        input.rtlData,
        input.specificationData,
      );

      this.sendProgress("in_progress", "Grouping related signals...", {
        signalGroups: signalGroups.length,
      });

      // Create initial agent mappings based on protocols and signal groups
      const initialMappings = this.createInitialMappings(
        input.specificationData,
        input.rtlData,
        signalGroups,
      );

      this.sendProgress("in_progress", "Creating agent mappings...", {
        agentCount: initialMappings.length,
      });

      // Use LLM for enhanced alignment mapping
      this.sendProgress("in_progress", "Invoking LLM for alignment mapping...");

      const llmAlignment = await this.alignWithLLM(
        input.llmProvider,
        input.specificationData,
        input.rtlData,
      );

      // Merge initial mappings with LLM analysis
      const agentMappings = this.mergeMappings(
        initialMappings,
        llmAlignment.agentMappings || [],
      );

      // Create signal assignments
      const signalAssignments = this.createSignalAssignments(
        agentMappings,
        input.rtlData,
      );

      // Select coverage signals
      const coverageSignals = this.selectCoverageSignals(
        input.specificationData,
        input.rtlData,
        llmAlignment.coverageSignals || [],
      );

      // Identify scoreboard pairs
      const scoreboardPairs = this.identifyScoreboardPairs(
        input.rtlData,
        agentMappings,
        llmAlignment.scoreboardPairs || [],
      );

      const data: AlignmentAgentData = {
        agentMappings,
        signalAssignments,
        coverageSignals,
        scoreboardPairs,
      };

      this.sendProgress("completed", "Alignment analysis complete", {
        agentMappings: agentMappings.length,
        signalAssignments: signalAssignments.length,
        coverageSignals: coverageSignals.length,
        scoreboardPairs: scoreboardPairs.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Alignment Agent failed:`, error);
      this.sendProgress("failed", `Alignment failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Group related signals based on naming patterns and protocol detection
   */
  private groupSignals(
    rtlData: RTLAgentData,
    specData: SpecificationAgentData,
  ): Array<{ name: string; signals: string[] }> {
    const groups: Array<{ name: string; signals: string[] }> = [];

    // Group by protocol if detected
    for (const protocol of specData.protocols) {
      const protocolSignals = rtlData.ports
        .filter((port) =>
          protocol.signals.some((sig) =>
            port.name.toLowerCase().includes(sig.toLowerCase()),
          ),
        )
        .map((port) => port.name);

      if (protocolSignals.length > 0) {
        groups.push({
          name: `${protocol.name.toLowerCase()}_interface`,
          signals: protocolSignals,
        });
      }
    }

    // Group remaining signals by common prefixes
    const ungroupedSignals = rtlData.ports
      .filter(
        (port) =>
          !groups.some((group) => group.signals.includes(port.name)) &&
          !rtlData.clockSignals.some((clk) => clk.name === port.name) &&
          !rtlData.resetSignals.some((rst) => rst.name === port.name),
      )
      .map((port) => port.name);

    // Simple prefix-based grouping
    const prefixGroups = new Map<string, string[]>();
    for (const signal of ungroupedSignals) {
      const prefix = signal.split("_")[0];
      if (!prefixGroups.has(prefix)) {
        prefixGroups.set(prefix, []);
      }
      prefixGroups.get(prefix)!.push(signal);
    }

    // Add prefix groups with more than one signal
    for (const [prefix, signals] of Array.from(prefixGroups.entries())) {
      if (signals.length > 1) {
        groups.push({
          name: `${prefix}_interface`,
          signals,
        });
      }
    }

    return groups;
  }

  /**
   * Create initial agent mappings based on protocols and signal directions
   */
  private createInitialMappings(
    specData: SpecificationAgentData,
    rtlData: RTLAgentData,
    signalGroups: Array<{ name: string; signals: string[] }>,
  ): AgentMapping[] {
    const mappings: AgentMapping[] = [];

    // Create mappings for each protocol
    for (const protocol of specData.protocols) {
      const protocolGroup = signalGroups.find((group) =>
        group.name.toLowerCase().includes(protocol.name.toLowerCase()),
      );

      if (protocolGroup) {
        // Determine agent type based on signal directions
        const signals = protocolGroup.signals;
        const hasOutputs = signals.some((sig) => {
          const port = rtlData.ports.find((p) => p.name === sig);
          return port && port.direction === "output";
        });

        const hasInputs = signals.some((sig) => {
          const port = rtlData.ports.find((p) => p.name === sig);
          return port && port.direction === "input";
        });

        // Active if has inputs (testbench drives them), passive if only outputs
        const agentType: "active" | "passive" = hasInputs
          ? "active"
          : "passive";

        mappings.push({
          agentName: `${protocol.name.toLowerCase()}_agent`,
          agentType,
          protocol: protocol.name,
          signals,
          transactions: specData.transactions
            .filter((t) =>
              t.name.toLowerCase().includes(protocol.name.toLowerCase()),
            )
            .map((t) => t.name),
        });
      }
    }

    // Create mappings for non-protocol signal groups
    for (const group of signalGroups) {
      if (
        !mappings.some((m) => m.signals.some((s) => group.signals.includes(s)))
      ) {
        const hasInputs = group.signals.some((sig) => {
          const port = rtlData.ports.find((p) => p.name === sig);
          return port && port.direction === "input";
        });

        const agentType: "active" | "passive" = hasInputs
          ? "active"
          : "passive";

        mappings.push({
          agentName: group.name.replace("_interface", "_agent"),
          agentType,
          signals: group.signals,
          transactions: [],
        });
      }
    }

    return mappings;
  }

  /**
   * Merge initial mappings with LLM analysis
   */
  private mergeMappings(
    initialMappings: AgentMapping[],
    llmMappings: AgentMapping[],
  ): AgentMapping[] {
    const merged = new Map<string, AgentMapping>();

    // Add initial mappings
    for (const mapping of initialMappings) {
      merged.set(mapping.agentName, mapping);
    }

    // Merge or add LLM mappings
    for (const mapping of llmMappings) {
      const existing = merged.get(mapping.agentName);
      if (existing) {
        // Merge: prefer LLM analysis for agent type and transactions
        merged.set(mapping.agentName, {
          agentName: mapping.agentName,
          agentType: mapping.agentType || existing.agentType,
          protocol: mapping.protocol || existing.protocol,
          signals: Array.from(
            new Set([...existing.signals, ...mapping.signals]),
          ),
          transactions: Array.from(
            new Set([...existing.transactions, ...mapping.transactions]),
          ),
        });
      } else {
        merged.set(mapping.agentName, mapping);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Create signal assignments for each signal
   */
  private createSignalAssignments(
    agentMappings: AgentMapping[],
    rtlData: RTLAgentData,
  ): SignalAssignment[] {
    const assignments: SignalAssignment[] = [];

    for (const mapping of agentMappings) {
      for (const signal of mapping.signals) {
        const port = rtlData.ports.find((p) => p.name === signal);
        if (!port) continue;

        let role: "driver" | "monitor" | "both";

        if (mapping.agentType === "active") {
          // Active agent: inputs are driven, outputs are monitored
          if (port.direction === "input") {
            role = "driver";
          } else if (port.direction === "output") {
            role = "monitor";
          } else {
            // inout
            role = "both";
          }
        } else {
          // Passive agent: only monitors
          role = "monitor";
        }

        assignments.push({
          signal,
          role,
          agentName: mapping.agentName,
        });
      }
    }

    return assignments;
  }

  /**
   * Select signals for functional coverage
   */
  private selectCoverageSignals(
    specData: SpecificationAgentData,
    rtlData: RTLAgentData,
    llmCoverageSignals: string[],
  ): string[] {
    const coverageSignals = new Set<string>();

    // Add signals mentioned in coverage goals
    for (const goal of specData.coverageGoals.functionalCoverage) {
      for (const port of rtlData.ports) {
        if (goal.toLowerCase().includes(port.name.toLowerCase())) {
          coverageSignals.add(port.name);
        }
      }
    }

    // Add transaction field signals
    for (const transaction of specData.transactions) {
      for (const field of transaction.fields) {
        const matchingPort = rtlData.ports.find(
          (p) => p.name.toLowerCase() === field.name.toLowerCase(),
        );
        if (matchingPort) {
          coverageSignals.add(matchingPort.name);
        }
      }
    }

    // Add LLM-suggested coverage signals
    for (const signal of llmCoverageSignals) {
      if (rtlData.ports.some((p) => p.name === signal)) {
        coverageSignals.add(signal);
      }
    }

    // Add data and address signals (common coverage points)
    for (const port of rtlData.ports) {
      const name = port.name.toLowerCase();
      if (
        name.includes("data") ||
        name.includes("addr") ||
        name.includes("cmd") ||
        name.includes("resp")
      ) {
        coverageSignals.add(port.name);
      }
    }

    return Array.from(coverageSignals);
  }

  /**
   * Identify input-output signal pairs for scoreboard checking
   */
  private identifyScoreboardPairs(
    rtlData: RTLAgentData,
    agentMappings: AgentMapping[],
    llmPairs: ScoreboardPair[],
  ): ScoreboardPair[] {
    const pairs: ScoreboardPair[] = [];

    // Start with LLM-identified pairs
    pairs.push(...llmPairs);

    // Identify input-output pairs based on naming patterns
    const inputPorts = rtlData.ports.filter((p) => p.direction === "input");
    const outputPorts = rtlData.ports.filter((p) => p.direction === "output");

    // Look for data flow patterns (e.g., write_data -> read_data)
    for (const inputPort of inputPorts) {
      const inputName = inputPort.name.toLowerCase();

      // Skip clock and reset signals
      if (
        rtlData.clockSignals.some((c) => c.name === inputPort.name) ||
        rtlData.resetSignals.some((r) => r.name === inputPort.name)
      ) {
        continue;
      }

      // Look for corresponding output
      for (const outputPort of outputPorts) {
        const outputName = outputPort.name.toLowerCase();

        // Check for related names (e.g., wdata -> rdata, in_data -> out_data)
        const isRelated =
          (inputName.includes("data") && outputName.includes("data")) ||
          (inputName.includes("addr") && outputName.includes("addr")) ||
          inputName.replace("in", "") === outputName.replace("out", "") ||
          inputName.replace("write", "") === outputName.replace("read", "");

        if (isRelated) {
          // Avoid duplicates
          const exists = pairs.some(
            (p) =>
              p.inputSignals.includes(inputPort.name) &&
              p.outputSignals.includes(outputPort.name),
          );

          if (!exists) {
            // Determine checking strategy based on protocol complexity
            const hasComplexProtocol = agentMappings.some(
              (m) =>
                (m.protocol === "AXI" || m.protocol === "APB") &&
                (m.signals.includes(inputPort.name) ||
                  m.signals.includes(outputPort.name)),
            );

            pairs.push({
              inputSignals: [inputPort.name],
              outputSignals: [outputPort.name],
              checkingStrategy: hasComplexProtocol
                ? "reference_model"
                : "transaction_comparison",
            });
          }
        }
      }
    }

    return pairs;
  }

  /**
   * Align specification and RTL with LLM
   */
  private async alignWithLLM(
    llm: any,
    specData: SpecificationAgentData,
    rtlData: RTLAgentData,
  ): Promise<any> {
    // Fill the prompt template
    const prompt = fillTemplate(PROMPT_TEMPLATES.alignment, {
      specificationData: JSON.stringify(specData, null, 2),
      rtlData: JSON.stringify(
        {
          topModule: rtlData.topModule,
          ports: rtlData.ports,
          clockSignals: rtlData.clockSignals,
          resetSignals: rtlData.resetSignals,
        },
        null,
        2,
      ),
    });

    // Invoke LLM with retry logic
    const response = await this.invokeLLM(llm, prompt);

    // Parse JSON response
    return this.parseJsonResponse(response);
  }
}

// Export singleton instance
export const alignmentAgent = new AlignmentAgent();
