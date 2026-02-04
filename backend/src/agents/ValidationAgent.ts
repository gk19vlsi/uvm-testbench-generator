import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { GeneratorAgentData } from "./GeneratorAgent";
import { SequenceAgentData } from "./SequenceAgent";
import { RTLAgentData } from "./RTLAgent";
import logger from "../config/logger";

/**
 * Completeness check result
 */
export interface CompletenessCheck {
  category: string;
  passed: boolean;
  details: string;
}

/**
 * Connectivity check result
 */
export interface ConnectivityCheck {
  signal: string;
  connected: boolean;
  details: string;
}

/**
 * Syntax error information
 */
export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

/**
 * Syntax check result
 */
export interface SyntaxCheck {
  filePath: string;
  valid: boolean;
  errors: SyntaxError[];
}

/**
 * Simulation readiness score
 */
export interface SimulationReadinessScore {
  overall: number; // 0-100
  breakdown: {
    completeness: number;
    connectivity: number;
    syntax: number;
    coverage: number;
  };
  classification: "Not Ready" | "Needs Review" | "Ready";
}

/**
 * Recommendation
 */
export interface Recommendation {
  severity: "critical" | "warning" | "info";
  category: string;
  message: string;
  actionable: string;
}

/**
 * Validation Agent input
 */
export interface ValidationAgentInput extends AgentInput {
  generatorData: GeneratorAgentData;
  sequenceData: SequenceAgentData;
  rtlData: RTLAgentData;
}

/**
 * Validation Agent output data
 */
export interface ValidationAgentData {
  completenessChecks: CompletenessCheck[];
  connectivityChecks: ConnectivityCheck[];
  syntaxChecks: SyntaxCheck[];
  readinessScore: SimulationReadinessScore;
  recommendations: Recommendation[];
}

/**
 * Validation and Readiness Agent
 *
 * Validates testbench completeness and calculates simulation readiness by:
 * - Checking all required UVM components are present
 * - Validating signal connectivity
 * - Verifying clock and reset handling
 * - Performing syntax validation
 * - Computing simulation readiness score (0-100)
 * - Generating actionable recommendations
 *
 * Requirements: 9.1-9.6, 18.1-18.5
 */
export class ValidationAgent extends BaseAgent {
  constructor() {
    super("Validation Agent");
  }

  /**
   * Execute validation
   */
  public async execute(input: ValidationAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting testbench validation...");

      // Validate input data
      if (!input.generatorData) {
        throw new Error("Generator data is required");
      }
      if (!input.sequenceData) {
        throw new Error("Sequence data is required");
      }
      if (!input.rtlData) {
        throw new Error("RTL data is required");
      }

      this.sendProgress("in_progress", "Checking component completeness...");

      // Perform completeness checks
      const completenessChecks = this.checkCompleteness(
        input.generatorData,
        input.sequenceData,
      );

      this.sendProgress("in_progress", "Validating signal connectivity...", {
        completenessScore: this.calculateCompletenessScore(completenessChecks),
      });

      // Perform connectivity checks
      const connectivityChecks = this.checkConnectivity(
        input.generatorData,
        input.rtlData,
      );

      this.sendProgress("in_progress", "Validating clock and reset logic...", {
        connectivityScore: this.calculateConnectivityScore(connectivityChecks),
      });

      // Validate clock and reset
      const clockResetChecks = this.validateClockReset(
        input.generatorData,
        input.rtlData,
      );
      completenessChecks.push(...clockResetChecks);

      this.sendProgress("in_progress", "Performing syntax validation...");

      // Perform syntax validation
      const syntaxChecks = await this.validateSyntax(input.generatorData);

      this.sendProgress("in_progress", "Calculating readiness score...", {
        syntaxScore: this.calculateSyntaxScore(syntaxChecks),
      });

      // Calculate readiness score
      const readinessScore = this.calculateReadinessScore(
        completenessChecks,
        connectivityChecks,
        syntaxChecks,
        input.generatorData,
      );

      this.sendProgress("in_progress", "Generating recommendations...", {
        overallScore: readinessScore.overall,
        classification: readinessScore.classification,
      });

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        completenessChecks,
        connectivityChecks,
        syntaxChecks,
        readinessScore,
      );

      const data: ValidationAgentData = {
        completenessChecks,
        connectivityChecks,
        syntaxChecks,
        readinessScore,
        recommendations,
      };

      this.sendProgress("completed", "Validation complete", {
        readinessScore: readinessScore.overall,
        classification: readinessScore.classification,
        recommendationCount: recommendations.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Validation Agent failed:`, error);
      this.sendProgress("failed", `Validation failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Check component completeness
   */
  private checkCompleteness(
    generatorData: GeneratorAgentData,
    sequenceData: SequenceAgentData,
  ): CompletenessCheck[] {
    const checks: CompletenessCheck[] = [];

    // Check for required component types
    const requiredTypes = [
      "interface",
      "driver",
      "monitor",
      "sequencer",
      "agent",
      "env",
      "scoreboard",
      "transaction",
    ];

    for (const type of requiredTypes) {
      const hasType = generatorData.generatedFiles.some((f) => f.type === type);

      checks.push({
        category: `${type}_present`,
        passed: hasType,
        details: hasType
          ? `${type} component(s) generated`
          : `Missing ${type} component`,
      });
    }

    // Check for sequences
    checks.push({
      category: "sequences_present",
      passed: sequenceData.sequences.length > 0,
      details:
        sequenceData.sequences.length > 0
          ? `${sequenceData.sequences.length} sequence(s) generated`
          : "No sequences generated",
    });

    // Check for tests
    checks.push({
      category: "tests_present",
      passed: sequenceData.tests.length > 0,
      details:
        sequenceData.tests.length > 0
          ? `${sequenceData.tests.length} test(s) generated`
          : "No tests generated",
    });

    // Check for base sequence
    const hasBaseSeq = sequenceData.sequences.some((s) => s.type === "base");
    checks.push({
      category: "base_sequence_present",
      passed: hasBaseSeq,
      details: hasBaseSeq ? "Base sequence generated" : "Missing base sequence",
    });

    // Check for smoke test
    const hasSmokeTest = sequenceData.tests.some((t) => t.type === "smoke");
    checks.push({
      category: "smoke_test_present",
      passed: hasSmokeTest,
      details: hasSmokeTest ? "Smoke test generated" : "Missing smoke test",
    });

    return checks;
  }

  /**
   * Check signal connectivity
   */
  private checkConnectivity(
    generatorData: GeneratorAgentData,
    rtlData: RTLAgentData,
  ): ConnectivityCheck[] {
    const checks: ConnectivityCheck[] = [];

    // Get all interface signals from generated files
    const interfaceFiles = generatorData.generatedFiles.filter(
      (f) => f.type === "interface",
    );

    const interfaceSignals = new Set<string>();
    for (const ifFile of interfaceFiles) {
      // Extract signal names from interface content
      const signalMatches = ifFile.content.matchAll(
        /logic\s+(?:\[.*?\]\s+)?(\w+);/g,
      );
      for (const match of signalMatches) {
        interfaceSignals.add(match[1]);
      }
    }

    // Check if all DUT ports are represented in interfaces
    for (const port of rtlData.ports) {
      const connected = interfaceSignals.has(port.name);

      checks.push({
        signal: port.name,
        connected,
        details: connected
          ? `Port ${port.name} connected to interface`
          : `Port ${port.name} not found in any interface`,
      });
    }

    return checks;
  }

  /**
   * Validate clock and reset handling
   */
  private validateClockReset(
    generatorData: GeneratorAgentData,
    rtlData: RTLAgentData,
  ): CompletenessCheck[] {
    const checks: CompletenessCheck[] = [];

    // Check for clock signals in interfaces
    const hasClockInInterface = generatorData.generatedFiles.some(
      (f) =>
        f.type === "interface" &&
        rtlData.clockSignals.some((clk) => f.content.includes(clk.name)),
    );

    checks.push({
      category: "clock_in_interface",
      passed: hasClockInInterface,
      details: hasClockInInterface
        ? "Clock signal(s) present in interface"
        : "Clock signal(s) missing from interface",
    });

    // Check for reset signals in interfaces
    const hasResetInInterface = generatorData.generatedFiles.some(
      (f) =>
        f.type === "interface" &&
        rtlData.resetSignals.some((rst) => f.content.includes(rst.name)),
    );

    checks.push({
      category: "reset_in_interface",
      passed: hasResetInInterface,
      details: hasResetInInterface
        ? "Reset signal(s) present in interface"
        : "Reset signal(s) missing from interface",
    });

    // Check for clocking blocks
    const hasClockingBlocks = generatorData.generatedFiles.some(
      (f) => f.type === "interface" && f.content.includes("clocking"),
    );

    checks.push({
      category: "clocking_blocks_present",
      passed: hasClockingBlocks,
      details: hasClockingBlocks
        ? "Clocking blocks present in interface(s)"
        : "No clocking blocks found",
    });

    return checks;
  }

  /**
   * Validate syntax of generated files
   */
  private async validateSyntax(
    generatorData: GeneratorAgentData,
  ): Promise<SyntaxCheck[]> {
    const checks: SyntaxCheck[] = [];

    // Basic syntax validation (checking for common issues)
    for (const file of generatorData.generatedFiles) {
      const errors: SyntaxError[] = [];

      // Check for unmatched backticks
      const backtickCount = (file.content.match(/`/g) || []).length;
      if (backtickCount % 2 !== 0) {
        errors.push({
          line: 0,
          column: 0,
          message: "Unmatched backtick in file",
          severity: "error",
        });
      }

      // Check for unmatched begin/end
      const beginCount = (file.content.match(/\bbegin\b/g) || []).length;
      const endCount = (file.content.match(/\bend\b/g) || []).length;
      if (beginCount !== endCount) {
        errors.push({
          line: 0,
          column: 0,
          message: `Unmatched begin/end blocks (${beginCount} begin, ${endCount} end)`,
          severity: "error",
        });
      }

      // Check for unmatched parentheses
      let parenDepth = 0;
      for (let i = 0; i < file.content.length; i++) {
        if (file.content[i] === "(") parenDepth++;
        if (file.content[i] === ")") parenDepth--;
        if (parenDepth < 0) {
          errors.push({
            line: 0,
            column: i,
            message: "Unmatched closing parenthesis",
            severity: "error",
          });
          break;
        }
      }
      if (parenDepth > 0) {
        errors.push({
          line: 0,
          column: 0,
          message: "Unmatched opening parenthesis",
          severity: "error",
        });
      }

      // Check for UVM macro usage
      const hasUvmMacros =
        file.content.includes("`uvm_component_utils") ||
        file.content.includes("`uvm_object_utils");

      if (
        (file.type === "driver" ||
          file.type === "monitor" ||
          file.type === "sequencer" ||
          file.type === "agent" ||
          file.type === "env" ||
          file.type === "scoreboard") &&
        !hasUvmMacros
      ) {
        errors.push({
          line: 0,
          column: 0,
          message: "Missing UVM factory registration macro",
          severity: "warning",
        });
      }

      checks.push({
        filePath: file.path,
        valid: errors.filter((e) => e.severity === "error").length === 0,
        errors,
      });
    }

    return checks;
  }

  /**
   * Calculate completeness score
   */
  private calculateCompletenessScore(checks: CompletenessCheck[]): number {
    if (checks.length === 0) return 0;

    const passed = checks.filter((c) => c.passed).length;
    return (passed / checks.length) * 100;
  }

  /**
   * Calculate connectivity score
   */
  private calculateConnectivityScore(checks: ConnectivityCheck[]): number {
    if (checks.length === 0) return 100; // No ports to connect

    const connected = checks.filter((c) => c.connected).length;
    return (connected / checks.length) * 100;
  }

  /**
   * Calculate syntax score
   */
  private calculateSyntaxScore(checks: SyntaxCheck[]): number {
    if (checks.length === 0) return 0;

    const valid = checks.filter((c) => c.valid).length;
    return (valid / checks.length) * 100;
  }

  /**
   * Calculate coverage score
   */
  private calculateCoverageScore(generatorData: GeneratorAgentData): number {
    // Check if coverage-related code is present
    const hasCovergroups = generatorData.generatedFiles.some((f) =>
      f.content.includes("covergroup"),
    );

    const hasCoverpoints = generatorData.generatedFiles.some((f) =>
      f.content.includes("coverpoint"),
    );

    const hasSampling = generatorData.generatedFiles.some((f) =>
      f.content.includes("sample()"),
    );

    let score = 0;
    if (hasCovergroups) score += 40;
    if (hasCoverpoints) score += 40;
    if (hasSampling) score += 20;

    return score;
  }

  /**
   * Calculate overall readiness score
   */
  private calculateReadinessScore(
    completenessChecks: CompletenessCheck[],
    connectivityChecks: ConnectivityCheck[],
    syntaxChecks: SyntaxCheck[],
    generatorData: GeneratorAgentData,
  ): SimulationReadinessScore {
    const completenessScore =
      this.calculateCompletenessScore(completenessChecks);
    const connectivityScore =
      this.calculateConnectivityScore(connectivityChecks);
    const syntaxScore = this.calculateSyntaxScore(syntaxChecks);
    const coverageScore = this.calculateCoverageScore(generatorData);

    // Weighted average: completeness 35%, connectivity 35%, syntax 20%, coverage 10%
    const overall =
      completenessScore * 0.35 +
      connectivityScore * 0.35 +
      syntaxScore * 0.2 +
      coverageScore * 0.1;

    // Determine classification
    let classification: "Not Ready" | "Needs Review" | "Ready";
    if (overall < 70) {
      classification = "Not Ready";
    } else if (overall < 90) {
      classification = "Needs Review";
    } else {
      classification = "Ready";
    }

    return {
      overall: Math.round(overall),
      breakdown: {
        completeness: Math.round(completenessScore),
        connectivity: Math.round(connectivityScore),
        syntax: Math.round(syntaxScore),
        coverage: Math.round(coverageScore),
      },
      classification,
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    completenessChecks: CompletenessCheck[],
    connectivityChecks: ConnectivityCheck[],
    syntaxChecks: SyntaxCheck[],
    readinessScore: SimulationReadinessScore,
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Recommendations for failed completeness checks
    for (const check of completenessChecks) {
      if (!check.passed) {
        const severity =
          check.category.includes("test") || check.category.includes("sequence")
            ? "warning"
            : "critical";

        recommendations.push({
          severity,
          category: "completeness",
          message: check.details,
          actionable: this.getCompletenessActionable(check.category),
        });
      }
    }

    // Recommendations for unconnected signals
    const unconnectedSignals = connectivityChecks.filter((c) => !c.connected);
    if (unconnectedSignals.length > 0) {
      recommendations.push({
        severity: "critical",
        category: "connectivity",
        message: `${unconnectedSignals.length} DUT port(s) not connected to interface`,
        actionable: `Add the following signals to interface: ${unconnectedSignals.map((s) => s.signal).join(", ")}`,
      });
    }

    // Recommendations for syntax errors
    for (const check of syntaxChecks) {
      const errors = check.errors.filter((e) => e.severity === "error");
      if (errors.length > 0) {
        recommendations.push({
          severity: "critical",
          category: "syntax",
          message: `${errors.length} syntax error(s) in ${check.filePath}`,
          actionable: `Fix syntax errors: ${errors.map((e) => e.message).join("; ")}`,
        });
      }

      const warnings = check.errors.filter((e) => e.severity === "warning");
      if (warnings.length > 0) {
        recommendations.push({
          severity: "warning",
          category: "syntax",
          message: `${warnings.length} syntax warning(s) in ${check.filePath}`,
          actionable: `Address warnings: ${warnings.map((e) => e.message).join("; ")}`,
        });
      }
    }

    // Overall readiness recommendations
    if (readinessScore.overall < 70) {
      recommendations.push({
        severity: "critical",
        category: "readiness",
        message: "Testbench is not ready for simulation",
        actionable:
          "Address critical issues in completeness, connectivity, and syntax before attempting simulation",
      });
    } else if (readinessScore.overall < 90) {
      recommendations.push({
        severity: "info",
        category: "readiness",
        message: "Testbench needs review before simulation",
        actionable: "Review and address warnings to improve testbench quality",
      });
    } else {
      recommendations.push({
        severity: "info",
        category: "readiness",
        message: "Testbench is ready for simulation",
        actionable:
          "Proceed with compilation and simulation using the provided README instructions",
      });
    }

    return recommendations;
  }

  /**
   * Get actionable recommendation for completeness check
   */
  private getCompletenessActionable(category: string): string {
    const actionables: Record<string, string> = {
      interface_present: "Generate interface file with signal declarations",
      driver_present: "Generate driver component with UVM phases",
      monitor_present: "Generate monitor component with analysis port",
      sequencer_present: "Generate sequencer component",
      agent_present: "Generate agent component with driver/monitor connections",
      env_present: "Generate environment component",
      scoreboard_present: "Generate scoreboard component",
      transaction_present: "Generate transaction class",
      sequences_present: "Generate at least one sequence",
      tests_present: "Generate at least one test",
      base_sequence_present: "Generate base sequence class",
      smoke_test_present: "Generate smoke test for basic sanity checking",
      clock_in_interface: "Add clock signal to interface",
      reset_in_interface: "Add reset signal to interface",
      clocking_blocks_present: "Add clocking blocks to interface",
    };

    return actionables[category] || "Review and regenerate missing component";
  }
}

// Export singleton instance
export const validationAgent = new ValidationAgent();
