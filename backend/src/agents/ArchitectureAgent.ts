import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { fillTemplate, PROMPT_TEMPLATES } from "../prompts/templates";
import { SpecificationAgentData } from "./SpecificationAgent";
import { RTLAgentData } from "./RTLAgent";
import { AlignmentAgentData } from "./AlignmentAgent";
import logger from "../config/logger";

/**
 * Environment hierarchy structure
 */
export interface EnvironmentHierarchy {
  topEnv: string;
  agents: string[];
  scoreboard: string;
  coverage: string[];
}

/**
 * Agent component structure
 */
export interface AgentComponents {
  driver?: string;
  monitor: string;
  sequencer?: string;
  agent: string;
}

/**
 * Agent architecture definition
 */
export interface AgentArchitecture {
  name: string;
  type: "active" | "passive";
  components: AgentComponents;
}

/**
 * Clocking block specification
 */
export interface ClockingBlockSpec {
  name: string;
  clock: string;
  direction: "driver" | "monitor";
  skew: string;
}

/**
 * Virtual interface specification
 */
export interface VirtualInterfaceSpec {
  name: string;
  signals: string[];
  clockingBlocks: ClockingBlockSpec[];
}

/**
 * Scoreboard design specification
 */
export interface ScoreboardDesign {
  strategy: "reference_model" | "transaction_comparison";
  inputPorts: string[];
  outputPorts: string[];
  comparisonLogic: string;
}

/**
 * Covergroup specification
 */
export interface CovergroupSpec {
  name: string;
  location: string;
  samplingEvent: string;
  coverpoints: string[];
}

/**
 * Coverage design specification
 */
export interface CoverageDesign {
  covergroups: CovergroupSpec[];
}

/**
 * Architecture Agent input
 */
export interface ArchitectureAgentInput extends AgentInput {
  alignmentData: AlignmentAgentData;
  specificationData: SpecificationAgentData;
  rtlData: RTLAgentData;
}

/**
 * Architecture Agent output data
 */
export interface ArchitectureAgentData {
  environmentHierarchy: EnvironmentHierarchy;
  agents: AgentArchitecture[];
  virtualInterfaces: VirtualInterfaceSpec[];
  scoreboardDesign: ScoreboardDesign;
  coverageDesign: CoverageDesign;
}

/**
 * UVM Architecture Planner Agent
 *
 * Plans the UVM testbench structure by:
 * - Determining agent count and types from alignment data
 * - Designing environment hierarchy (env, agents, scoreboard)
 * - Planning virtual interface specifications
 * - Designing scoreboard strategy (reference model vs transaction comparison)
 * - Planning coverage model placement
 *
 * Requirements: 6.1-6.5
 */
export class ArchitectureAgent extends BaseAgent {
  constructor() {
    super("Architecture Agent");
  }

  /**
   * Execute architecture planning
   */
  public async execute(input: ArchitectureAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting architecture planning...");

      // Validate input data
      if (!input.alignmentData) {
        throw new Error("Alignment data is required");
      }
      if (!input.specificationData) {
        throw new Error("Specification data is required");
      }
      if (!input.rtlData) {
        throw new Error("RTL data is required");
      }

      this.sendProgress(
        "in_progress",
        "Analyzing alignment and specification data...",
        {
          agentMappings: input.alignmentData.agentMappings.length,
          protocols: input.specificationData.protocols.length,
        },
      );

      // Determine agent architectures from alignment data
      const agents = this.createAgentArchitectures(input.alignmentData);

      this.sendProgress("in_progress", "Designing agent architectures...", {
        agentCount: agents.length,
      });

      // Design environment hierarchy
      const environmentHierarchy = this.designEnvironmentHierarchy(
        input.rtlData.topModule,
        agents,
      );

      this.sendProgress("in_progress", "Designing environment hierarchy...", {
        topEnv: environmentHierarchy.topEnv,
      });

      // Plan virtual interfaces
      const virtualInterfaces = this.planVirtualInterfaces(
        input.alignmentData,
        input.rtlData,
      );

      this.sendProgress("in_progress", "Planning virtual interfaces...", {
        interfaceCount: virtualInterfaces.length,
      });

      // Design scoreboard strategy
      const scoreboardDesign = this.designScoreboard(
        input.alignmentData,
        input.specificationData,
        agents,
      );

      this.sendProgress("in_progress", "Designing scoreboard strategy...", {
        strategy: scoreboardDesign.strategy,
      });

      // Plan coverage design
      const coverageDesign = this.planCoverage(
        input.alignmentData,
        input.specificationData,
        agents,
      );

      this.sendProgress("in_progress", "Planning coverage model...", {
        covergroupCount: coverageDesign.covergroups.length,
      });

      // Use LLM for enhanced architecture planning
      this.sendProgress(
        "in_progress",
        "Invoking LLM for architecture refinement...",
      );

      const llmArchitecture = await this.planWithLLM(
        input.llmProvider,
        input.alignmentData,
        input.specificationData,
        input.rtlData,
      );

      // Merge with LLM enhancements
      const enhancedAgents = this.mergeAgentArchitectures(
        agents,
        llmArchitecture.agents || [],
      );

      const data: ArchitectureAgentData = {
        environmentHierarchy:
          llmArchitecture.environmentHierarchy || environmentHierarchy,
        agents: enhancedAgents,
        virtualInterfaces:
          llmArchitecture.virtualInterfaces || virtualInterfaces,
        scoreboardDesign: llmArchitecture.scoreboardDesign || scoreboardDesign,
        coverageDesign: llmArchitecture.coverageDesign || coverageDesign,
      };

      this.sendProgress("completed", "Architecture planning complete", {
        agents: data.agents.length,
        virtualInterfaces: data.virtualInterfaces.length,
        covergroups: data.coverageDesign.covergroups.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Architecture Agent failed:`, error);
      this.sendProgress("failed", `Planning failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Create agent architectures from alignment data
   */
  private createAgentArchitectures(
    alignmentData: AlignmentAgentData,
  ): AgentArchitecture[] {
    const architectures: AgentArchitecture[] = [];

    for (const mapping of alignmentData.agentMappings) {
      const components: AgentComponents = {
        monitor: `${mapping.agentName.replace("_agent", "")}_monitor`,
        agent: mapping.agentName,
      };

      // Active agents have drivers and sequencers
      if (mapping.agentType === "active") {
        components.driver = `${mapping.agentName.replace("_agent", "")}_driver`;
        components.sequencer = `${mapping.agentName.replace("_agent", "")}_sequencer`;
      }

      architectures.push({
        name: mapping.agentName,
        type: mapping.agentType,
        components,
      });
    }

    return architectures;
  }

  /**
   * Design environment hierarchy
   */
  private designEnvironmentHierarchy(
    topModule: string,
    agents: AgentArchitecture[],
  ): EnvironmentHierarchy {
    const envName = `${topModule}_env`;
    const scoreboardName = `${topModule}_scoreboard`;

    return {
      topEnv: envName,
      agents: agents.map((a) => a.name),
      scoreboard: scoreboardName,
      coverage: agents.map((a) => `${a.name.replace("_agent", "")}_coverage`),
    };
  }

  /**
   * Plan virtual interfaces
   */
  private planVirtualInterfaces(
    alignmentData: AlignmentAgentData,
    rtlData: RTLAgentData,
  ): VirtualInterfaceSpec[] {
    const interfaces: VirtualInterfaceSpec[] = [];

    for (const mapping of alignmentData.agentMappings) {
      const interfaceName = `${mapping.agentName.replace("_agent", "")}_if`;

      // Get clock signal (use first clock or default to "clk")
      const clockSignal =
        rtlData.clockSignals.length > 0 ? rtlData.clockSignals[0].name : "clk";

      // Create clocking blocks
      const clockingBlocks: ClockingBlockSpec[] = [
        {
          name: "monitor_cb",
          clock: clockSignal,
          direction: "monitor",
          skew: "#0", // No skew for monitoring
        },
      ];

      // Active agents need driver clocking block
      if (mapping.agentType === "active") {
        clockingBlocks.push({
          name: "driver_cb",
          clock: clockSignal,
          direction: "driver",
          skew: "#1", // 1 time unit skew for driving
        });
      }

      interfaces.push({
        name: interfaceName,
        signals: mapping.signals,
        clockingBlocks,
      });
    }

    return interfaces;
  }

  /**
   * Design scoreboard strategy
   */
  private designScoreboard(
    alignmentData: AlignmentAgentData,
    specificationData: SpecificationAgentData,
    agents: AgentArchitecture[],
  ): ScoreboardDesign {
    // Determine strategy based on protocol complexity
    const hasComplexProtocol = specificationData.protocols.some(
      (p) => p.name === "AXI" || p.name === "APB",
    );

    const strategy: "reference_model" | "transaction_comparison" =
      hasComplexProtocol ? "reference_model" : "transaction_comparison";

    // Identify input and output ports (monitor analysis ports)
    const inputPorts: string[] = [];
    const outputPorts: string[] = [];

    for (const agent of agents) {
      const mapping = alignmentData.agentMappings.find(
        (m) => m.agentName === agent.name,
      );

      if (mapping) {
        // Check if agent has input signals (from DUT perspective)
        const hasInputs = alignmentData.signalAssignments.some(
          (sa) =>
            sa.agentName === agent.name &&
            (sa.role === "driver" || sa.role === "both"),
        );

        // Check if agent has output signals (from DUT perspective)
        const hasOutputs = alignmentData.signalAssignments.some(
          (sa) =>
            sa.agentName === agent.name &&
            (sa.role === "monitor" || sa.role === "both"),
        );

        if (hasInputs) {
          inputPorts.push(`${agent.components.monitor}_ap`);
        }

        if (hasOutputs) {
          outputPorts.push(`${agent.components.monitor}_ap`);
        }
      }
    }

    // Generate comparison logic description
    const comparisonLogic =
      strategy === "reference_model"
        ? "Compare DUT outputs with reference model predictions"
        : "Compare input transactions with output transactions";

    return {
      strategy,
      inputPorts,
      outputPorts,
      comparisonLogic,
    };
  }

  /**
   * Plan coverage design
   */
  private planCoverage(
    alignmentData: AlignmentAgentData,
    specificationData: SpecificationAgentData,
    agents: AgentArchitecture[],
  ): CoverageDesign {
    const covergroups: CovergroupSpec[] = [];

    for (const agent of agents) {
      const mapping = alignmentData.agentMappings.find(
        (m) => m.agentName === agent.name,
      );

      if (!mapping) continue;

      // Get coverage signals for this agent
      const agentCoverageSignals = alignmentData.coverageSignals.filter((sig) =>
        mapping.signals.includes(sig),
      );

      if (agentCoverageSignals.length > 0) {
        const covergroupName = `${mapping.agentName.replace("_agent", "")}_transaction_cg`;

        covergroups.push({
          name: covergroupName,
          location: agent.components.monitor,
          samplingEvent: "transaction_complete",
          coverpoints: agentCoverageSignals,
        });
      }
    }

    // Add protocol-specific coverage if specified
    for (const protocol of specificationData.protocols) {
      const protocolAgent = agents.find((a) =>
        a.name.toLowerCase().includes(protocol.name.toLowerCase()),
      );

      if (protocolAgent) {
        const protocolCovergroupName = `${protocol.name.toLowerCase()}_protocol_cg`;

        // Check if we already have a covergroup for this agent
        const existingCovergroup = covergroups.find(
          (cg) => cg.location === protocolAgent.components.monitor,
        );

        if (!existingCovergroup) {
          covergroups.push({
            name: protocolCovergroupName,
            location: protocolAgent.components.monitor,
            samplingEvent: "transaction_complete",
            coverpoints: protocol.signals.slice(0, 5), // Limit to first 5 signals
          });
        }
      }
    }

    return {
      covergroups,
    };
  }

  /**
   * Merge agent architectures with LLM enhancements
   */
  private mergeAgentArchitectures(
    staticArchitectures: AgentArchitecture[],
    llmArchitectures: AgentArchitecture[],
  ): AgentArchitecture[] {
    const merged = new Map<string, AgentArchitecture>();

    // Add static architectures
    for (const arch of staticArchitectures) {
      merged.set(arch.name, arch);
    }

    // Merge or add LLM architectures
    for (const arch of llmArchitectures) {
      const existing = merged.get(arch.name);
      if (existing) {
        // Merge: prefer LLM component names if provided
        merged.set(arch.name, {
          name: arch.name,
          type: arch.type || existing.type,
          components: {
            driver: arch.components.driver || existing.components.driver,
            monitor: arch.components.monitor || existing.components.monitor,
            sequencer:
              arch.components.sequencer || existing.components.sequencer,
            agent: arch.components.agent || existing.components.agent,
          },
        });
      } else {
        merged.set(arch.name, arch);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Plan architecture with LLM
   */
  private async planWithLLM(
    llm: any,
    alignmentData: AlignmentAgentData,
    specificationData: SpecificationAgentData,
    rtlData: RTLAgentData,
  ): Promise<any> {
    // Fill the prompt template
    const prompt = fillTemplate(PROMPT_TEMPLATES.architecturePlanning, {
      alignmentData: JSON.stringify(alignmentData, null, 2),
      specificationData: JSON.stringify(
        {
          protocols: specificationData.protocols,
          transactions: specificationData.transactions,
          coverageGoals: specificationData.coverageGoals,
        },
        null,
        2,
      ),
      rtlData: JSON.stringify(
        {
          topModule: rtlData.topModule,
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
export const architectureAgent = new ArchitectureAgent();
