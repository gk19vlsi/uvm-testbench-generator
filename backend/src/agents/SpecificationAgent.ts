import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { fillTemplate, PROMPT_TEMPLATES } from "../prompts/templates";
import {
  detectProtocolsWithKeywords,
  mergeProtocolDetections,
  getProtocolCharacteristics,
} from "../utils/protocolDetection";
import logger from "../config/logger";

/**
 * Detected protocol information
 */
export interface DetectedProtocol {
  name: "AXI" | "APB" | "UART" | "I2C" | "SPI" | "CUSTOM";
  confidence: number; // 0-1
  signals: string[];
  characteristics: Record<string, any>;
}

/**
 * Transaction field definition
 */
export interface TransactionField {
  name: string;
  type: string;
  width?: number;
  constraints?: string[];
}

/**
 * Transaction definition
 */
export interface TransactionDefinition {
  name: string;
  fields: TransactionField[];
  constraints: string[];
}

/**
 * Clock domain information
 */
export interface ClockDomain {
  name: string;
  frequency?: number;
}

/**
 * Reset condition information
 */
export interface ResetCondition {
  name: string;
  polarity: "active_high" | "active_low";
}

/**
 * Timing constraints
 */
export interface TimingConstraints {
  clockDomains: ClockDomain[];
  resetConditions: ResetCondition[];
  timingRequirements: string[];
}

/**
 * Coverage goals
 */
export interface CoverageGoals {
  functionalCoverage: string[];
  crossCoverage: string[];
}

/**
 * Error scenario
 */
export interface ErrorScenario {
  name: string;
  condition: string;
  expectedResponse: string;
}

/**
 * Specification Agent input
 */
export interface SpecificationAgentInput extends AgentInput {
  specificationFiles: Array<{
    fileId: string;
    filename: string;
    content: string;
  }>;
}

/**
 * Specification Agent output data
 */
export interface SpecificationAgentData {
  protocols: DetectedProtocol[];
  transactions: TransactionDefinition[];
  timingConstraints: TimingConstraints;
  coverageGoals: CoverageGoals;
  errorScenarios: ErrorScenario[];
  verificationIntent: string;
}

/**
 * Specification Understanding Agent
 *
 * Parses specification documents and extracts verification requirements including:
 * - Protocol detection (AXI, APB, UART, I2C, SPI)
 * - Transaction definitions with fields and constraints
 * - Timing constraints (clocks, resets, timing)
 * - Coverage goals
 * - Error scenarios
 *
 * Requirements: 3.1-3.5
 */
export class SpecificationAgent extends BaseAgent {
  constructor() {
    super("Specification Agent");
  }

  /**
   * Execute specification analysis
   */
  public async execute(input: SpecificationAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting specification analysis...");

      // Validate specification files
      if (!input.specificationFiles || input.specificationFiles.length === 0) {
        throw new Error("No specification files provided");
      }

      // Combine all specification content
      const combinedContent = this.combineSpecificationContent(
        input.specificationFiles,
      );

      this.sendProgress(
        "in_progress",
        `Analyzing ${input.specificationFiles.length} specification file(s)...`,
        {
          fileCount: input.specificationFiles.length,
          totalLength: combinedContent.length,
        },
      );

      // Detect protocols using keyword matching
      const detectedProtocols = detectProtocolsWithKeywords(combinedContent);

      // Enhance protocols with characteristics
      for (const protocol of detectedProtocols) {
        protocol.characteristics = getProtocolCharacteristics(
          protocol.name,
          combinedContent,
        );
      }

      this.sendProgress(
        "in_progress",
        "Invoking LLM for detailed analysis...",
        {
          detectedProtocols: detectedProtocols.map((p) => p.name),
        },
      );

      // Use LLM for detailed analysis
      const llmAnalysis = await this.analyzWithLLM(
        input.llmProvider,
        combinedContent,
      );

      // Merge keyword-detected protocols with LLM analysis
      const mergedProtocols = mergeProtocolDetections(
        detectedProtocols,
        llmAnalysis.protocols || [],
      );

      const data: SpecificationAgentData = {
        protocols: mergedProtocols,
        transactions: llmAnalysis.transactions || [],
        timingConstraints: llmAnalysis.timingConstraints || {
          clockDomains: [],
          resetConditions: [],
          timingRequirements: [],
        },
        coverageGoals: llmAnalysis.coverageGoals || {
          functionalCoverage: [],
          crossCoverage: [],
        },
        errorScenarios: llmAnalysis.errorScenarios || [],
        verificationIntent:
          llmAnalysis.verificationIntent || "No verification intent specified",
      };

      this.sendProgress("completed", "Specification analysis complete", {
        protocolsDetected: data.protocols.length,
        transactionsFound: data.transactions.length,
        coverageGoals: data.coverageGoals.functionalCoverage.length,
        errorScenarios: data.errorScenarios.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Specification Agent failed:`, error);
      this.sendProgress("failed", `Analysis failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Combine content from multiple specification files
   */
  private combineSpecificationContent(
    files: Array<{ filename: string; content: string }>,
  ): string {
    return files
      .map((file) => {
        return `\n\n=== FILE: ${file.filename} ===\n\n${file.content}`;
      })
      .join("\n");
  }

  /**
   * Analyze specification with LLM
   */
  private async analyzWithLLM(
    llm: any,
    specificationText: string,
  ): Promise<any> {
    // Fill the prompt template
    const prompt = fillTemplate(PROMPT_TEMPLATES.specificationAnalysis, {
      specificationText,
    });

    // Invoke LLM with retry logic
    const response = await this.invokeLLM(llm, prompt);

    // Parse JSON response
    return this.parseJsonResponse(response);
  }
}

// Export singleton instance
export const specificationAgent = new SpecificationAgent();
