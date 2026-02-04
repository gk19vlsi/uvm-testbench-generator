import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { fillTemplate, PROMPT_TEMPLATES } from "../prompts/templates";
import {
  RTLParser,
  ModuleDefinition,
  Port,
  Parameter,
} from "../parsers/rtlParser";
import {
  classifyClockSignals,
  classifyResetSignals,
  groupRelatedSignals,
  identifyProtocolSignals,
} from "../utils/signalClassification";
import logger from "../config/logger";

/**
 * Clock signal information
 */
export interface ClockSignal {
  name: string;
  frequency?: number;
  dutyCycle?: number;
}

/**
 * Reset signal information
 */
export interface ResetSignal {
  name: string;
  polarity: "active_high" | "active_low";
  synchronous: boolean;
}

/**
 * Interface definition
 */
export interface InterfaceDefinition {
  name: string;
  signals: string[];
  modports?: string[];
}

/**
 * Module hierarchy node
 */
export interface ModuleHierarchyNode {
  moduleName: string;
  instanceName?: string;
  children: ModuleHierarchyNode[];
}

/**
 * RTL Agent input
 */
export interface RTLAgentInput extends AgentInput {
  rtlFiles: Array<{
    fileId: string;
    filename: string;
    content: string;
  }>;
}

/**
 * RTL Agent output data
 */
export interface RTLAgentData {
  modules: ModuleDefinition[];
  topModule: string;
  ports: Port[];
  interfaces: InterfaceDefinition[];
  clockSignals: ClockSignal[];
  resetSignals: ResetSignal[];
  parameters: Parameter[];
  hierarchy: ModuleHierarchyNode;
}

/**
 * RTL Design Intelligence Agent
 *
 * Analyzes RTL design files to extract:
 * - Module definitions with ports and parameters
 * - Interface declarations and modports
 * - Clock and reset signal classification
 * - Module hierarchy
 * - Signal groupings
 *
 * Requirements: 4.1-4.5
 */
export class RTLAgent extends BaseAgent {
  private parser: RTLParser;

  constructor() {
    super("RTL Agent");
    this.parser = new RTLParser();
  }

  /**
   * Execute RTL analysis
   */
  public async execute(input: RTLAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting RTL analysis...");

      // Validate RTL files
      if (!input.rtlFiles || input.rtlFiles.length === 0) {
        throw new Error("No RTL files provided");
      }

      this.sendProgress(
        "in_progress",
        `Analyzing ${input.rtlFiles.length} RTL file(s)...`,
        {
          fileCount: input.rtlFiles.length,
        },
      );

      // Parse all RTL files
      const allModules: ModuleDefinition[] = [];
      const parseWarnings: string[] = [];

      for (const file of input.rtlFiles) {
        this.sendProgress("in_progress", `Parsing ${file.filename}...`);

        const parseResult = this.parser.parseContent(file.content);

        if (parseResult.success && parseResult.modules) {
          allModules.push(...parseResult.modules);
          if (parseResult.warnings) {
            parseWarnings.push(...parseResult.warnings);
          }
        } else {
          parseWarnings.push(
            `Failed to parse ${file.filename}: ${parseResult.error}`,
          );
        }
      }

      if (allModules.length === 0) {
        throw new Error("No modules found in RTL files");
      }

      this.sendProgress("in_progress", `Found ${allModules.length} module(s)`, {
        moduleCount: allModules.length,
        moduleNames: allModules.map((m) => m.name),
      });

      // Identify top module
      const topModule = this.identifyTopModule(allModules);

      this.sendProgress("in_progress", `Identified top module: ${topModule}`);

      // Get top module definition
      const topModuleDef = allModules.find((m) => m.name === topModule);
      if (!topModuleDef) {
        throw new Error(`Top module ${topModule} not found`);
      }

      // Classify signals
      this.sendProgress("in_progress", "Classifying signals...");

      const combinedContent = input.rtlFiles.map((f) => f.content).join("\n");

      const clockSignals = classifyClockSignals(
        topModuleDef.ports,
        combinedContent,
      );

      const resetSignals = classifyResetSignals(
        topModuleDef.ports,
        combinedContent,
      );

      // Extract interfaces
      const interfaces = this.extractInterfaces(allModules);

      // Build module hierarchy
      this.sendProgress("in_progress", "Building module hierarchy...");
      const hierarchy = this.buildModuleHierarchy(allModules, topModule);

      // Use LLM for enhanced analysis if needed
      let llmEnhancements: any = {};
      if (parseWarnings.length > 0 || clockSignals.length === 0) {
        this.sendProgress(
          "in_progress",
          "Invoking LLM for enhanced analysis...",
        );

        try {
          llmEnhancements = await this.enhanceWithLLM(
            input.llmProvider,
            input.rtlFiles.map((f) => f.content).join("\n\n"),
            {
              modules: allModules,
              clockSignals,
              resetSignals,
            },
          );
        } catch (error: any) {
          logger.warn(
            "LLM enhancement failed, using static analysis only:",
            error.message,
          );
        }
      }

      // Merge LLM enhancements
      const enhancedClockSignals = this.mergeClockSignals(
        clockSignals,
        llmEnhancements.signalClassification?.clocks || [],
      );

      const enhancedResetSignals = this.mergeResetSignals(
        resetSignals,
        llmEnhancements.signalClassification?.resets || [],
      );

      const data: RTLAgentData = {
        modules: allModules,
        topModule,
        ports: topModuleDef.ports,
        interfaces,
        clockSignals: enhancedClockSignals,
        resetSignals: enhancedResetSignals,
        parameters: topModuleDef.parameters,
        hierarchy,
      };

      this.sendProgress("completed", "RTL analysis complete", {
        modulesAnalyzed: allModules.length,
        topModule,
        clockSignals: enhancedClockSignals.length,
        resetSignals: enhancedResetSignals.length,
        interfaces: interfaces.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`RTL Agent failed:`, error);
      this.sendProgress("failed", `Analysis failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Identify the top module (module that is not instantiated by others)
   */
  private identifyTopModule(modules: ModuleDefinition[]): string {
    const instantiatedModules = new Set<string>();

    // Collect all instantiated module names
    for (const module of modules) {
      for (const inst of module.instantiations) {
        instantiatedModules.add(inst.moduleName);
      }
    }

    // Find modules that are not instantiated
    const topModules = modules.filter((m) => !instantiatedModules.has(m.name));

    if (topModules.length === 0) {
      // If all modules are instantiated (circular), return the first one
      return modules[0].name;
    }

    if (topModules.length === 1) {
      return topModules[0].name;
    }

    // If multiple top modules, prefer ones with "top", "tb", or "dut" in name
    const preferredTop = topModules.find(
      (m) =>
        m.name.toLowerCase().includes("top") ||
        m.name.toLowerCase().includes("dut") ||
        m.name.toLowerCase().includes("tb"),
    );

    return preferredTop ? preferredTop.name : topModules[0].name;
  }

  /**
   * Classify clock signals based on naming patterns
   */
  private classifyClockSignals(ports: Port[], content: string): ClockSignal[] {
    const clockSignals: ClockSignal[] = [];
    const clockPatterns = [
      /\bclk\b/i,
      /\bclock\b/i,
      /_ck$/i,
      /^ck_/i,
      /\bclk_/i,
    ];

    for (const port of ports) {
      const isClockSignal = clockPatterns.some((pattern) =>
        pattern.test(port.name),
      );

      if (isClockSignal) {
        // Try to extract frequency from comments or parameters
        const frequencyMatch = content.match(
          new RegExp(`${port.name}.*?(\\d+)\\s*(?:MHz|mhz|MHZ)`, "i"),
        );

        clockSignals.push({
          name: port.name,
          frequency: frequencyMatch
            ? parseInt(frequencyMatch[1]) * 1000000
            : undefined,
          dutyCycle: 50, // Default duty cycle
        });
      }
    }

    return clockSignals;
  }

  /**
   * Classify reset signals based on naming patterns
   */
  private classifyResetSignals(ports: Port[], content: string): ResetSignal[] {
    const resetSignals: ResetSignal[] = [];
    const resetPatterns = [
      /\brst\b/i,
      /\breset\b/i,
      /^n?rst_/i,
      /_rst$/i,
      /_reset$/i,
    ];

    for (const port of ports) {
      const isResetSignal = resetPatterns.some((pattern) =>
        pattern.test(port.name),
      );

      if (isResetSignal) {
        // Determine polarity from name (n prefix or _n suffix indicates active low)
        const isActiveLow =
          port.name.startsWith("n") ||
          port.name.includes("_n") ||
          port.name.endsWith("_n");

        // Try to determine if synchronous or asynchronous
        const isSynchronous =
          content.toLowerCase().includes(`posedge ${port.name}`) ||
          content.toLowerCase().includes(`negedge ${port.name}`);

        resetSignals.push({
          name: port.name,
          polarity: isActiveLow ? "active_low" : "active_high",
          synchronous: isSynchronous,
        });
      }
    }

    return resetSignals;
  }

  /**
   * Extract interface definitions from modules
   */
  private extractInterfaces(
    modules: ModuleDefinition[],
  ): InterfaceDefinition[] {
    const interfaces: InterfaceDefinition[] = [];

    for (const module of modules) {
      if (module.interfaces && module.interfaces.length > 0) {
        for (const interfaceName of module.interfaces) {
          interfaces.push({
            name: interfaceName,
            signals: [], // Will be populated by static analysis or LLM
            modports: [],
          });
        }
      }
    }

    return interfaces;
  }

  /**
   * Build module hierarchy tree
   */
  private buildModuleHierarchy(
    modules: ModuleDefinition[],
    topModuleName: string,
  ): ModuleHierarchyNode {
    const moduleMap = new Map<string, ModuleDefinition>();
    for (const module of modules) {
      moduleMap.set(module.name, module);
    }

    const buildNode = (
      moduleName: string,
      instanceName?: string,
    ): ModuleHierarchyNode => {
      const module = moduleMap.get(moduleName);
      const children: ModuleHierarchyNode[] = [];

      if (module) {
        for (const inst of module.instantiations) {
          children.push(buildNode(inst.moduleName, inst.instanceName));
        }
      }

      return {
        moduleName,
        instanceName,
        children,
      };
    };

    return buildNode(topModuleName);
  }

  /**
   * Enhance analysis with LLM
   */
  private async enhanceWithLLM(
    llm: any,
    rtlCode: string,
    parsedInfo: any,
  ): Promise<any> {
    // Fill the prompt template
    const prompt = fillTemplate(PROMPT_TEMPLATES.rtlAnalysis, {
      rtlCode: rtlCode.substring(0, 10000), // Limit to first 10k chars
      parsedInfo: JSON.stringify(parsedInfo, null, 2),
    });

    // Invoke LLM with retry logic
    const response = await this.invokeLLM(llm, prompt);

    // Parse JSON response
    return this.parseJsonResponse(response);
  }

  /**
   * Merge clock signals from static analysis and LLM
   */
  private mergeClockSignals(
    staticClocks: ClockSignal[],
    llmClocks: ClockSignal[],
  ): ClockSignal[] {
    const merged = new Map<string, ClockSignal>();

    // Add static clocks
    for (const clock of staticClocks) {
      merged.set(clock.name, clock);
    }

    // Merge or add LLM clocks
    for (const clock of llmClocks) {
      const existing = merged.get(clock.name);
      if (existing) {
        // Merge: prefer LLM frequency if available
        merged.set(clock.name, {
          name: clock.name,
          frequency: clock.frequency || existing.frequency,
          dutyCycle: clock.dutyCycle || existing.dutyCycle,
        });
      } else {
        merged.set(clock.name, clock);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Merge reset signals from static analysis and LLM
   */
  private mergeResetSignals(
    staticResets: ResetSignal[],
    llmResets: ResetSignal[],
  ): ResetSignal[] {
    const merged = new Map<string, ResetSignal>();

    // Add static resets
    for (const reset of staticResets) {
      merged.set(reset.name, reset);
    }

    // Merge or add LLM resets
    for (const reset of llmResets) {
      const existing = merged.get(reset.name);
      if (existing) {
        // Merge: prefer LLM analysis if available
        merged.set(reset.name, {
          name: reset.name,
          polarity: reset.polarity || existing.polarity,
          synchronous:
            reset.synchronous !== undefined
              ? reset.synchronous
              : existing.synchronous,
        });
      } else {
        merged.set(reset.name, reset);
      }
    }

    return Array.from(merged.values());
  }
}

// Export singleton instance
export const rtlAgent = new RTLAgent();
