/**
 * Generation Mode Configuration
 * Defines feature sets for MVP, Production, and Advanced generation modes
 */

/**
 * Generation mode types
 */
export type GenerationMode = "mvp" | "production" | "advanced";

/**
 * Feature flags for generation modes
 */
export interface GenerationModeFeatures {
  // Agent configuration
  multiAgent: boolean; // Multiple agents vs single agent
  passiveAgents: boolean; // Support passive (monitor-only) agents

  // Component features
  scoreboard: boolean; // Include scoreboard
  coverage: boolean; // Include functional coverage
  sequences: {
    base: boolean; // Base sequence
    directed: boolean; // Directed sequences
    random: boolean; // Random sequences
    error: boolean; // Error injection sequences
    stress: boolean; // Stress sequences
  };
  tests: {
    smoke: boolean; // Smoke test
    random: boolean; // Random test
    directed: boolean; // Directed tests
    stress: boolean; // Stress tests
  };

  // Advanced features
  protocolAutoDetection: boolean; // Automatic protocol detection
  protocolSpecificLogic: boolean; // Protocol-specific driver/monitor logic
  multiDutSupport: boolean; // Support for multiple DUTs
  advancedScoreboard: boolean; // Reference model scoreboard
  crossCoverage: boolean; // Cross-coverage generation
  constrainedRandom: boolean; // Constrained-random sequences

  // Code quality
  factoryRegistration: boolean; // UVM factory registration
  configDb: boolean; // Config DB usage
  resetSequence: boolean; // Reset sequence generation
  clockingBlocks: boolean; // Clocking blocks in interfaces
}

/**
 * MVP Mode Configuration
 * Minimal viable testbench for quick validation
 */
export const MVP_MODE: GenerationModeFeatures = {
  multiAgent: false, // Single agent only
  passiveAgents: false,

  scoreboard: false, // No scoreboard
  coverage: false, // No coverage

  sequences: {
    base: true, // Only base sequence
    directed: false,
    random: false,
    error: false,
    stress: false,
  },

  tests: {
    smoke: true, // Only smoke test
    random: false,
    directed: false,
    stress: false,
  },

  protocolAutoDetection: false,
  protocolSpecificLogic: false,
  multiDutSupport: false,
  advancedScoreboard: false,
  crossCoverage: false,
  constrainedRandom: false,

  factoryRegistration: true, // Always include
  configDb: true, // Always include
  resetSequence: true, // Always include
  clockingBlocks: true, // Always include
};

/**
 * Production Mode Configuration
 * Full-featured testbench for comprehensive verification
 */
export const PRODUCTION_MODE: GenerationModeFeatures = {
  multiAgent: true, // Multiple agents
  passiveAgents: true, // Support passive agents

  scoreboard: true, // Include scoreboard
  coverage: true, // Include coverage

  sequences: {
    base: true,
    directed: true,
    random: true, // Constrained-random
    error: true,
    stress: false, // Not in production by default
  },

  tests: {
    smoke: true,
    random: true,
    directed: true,
    stress: false,
  },

  protocolAutoDetection: true, // Auto-detect protocols
  protocolSpecificLogic: true, // Protocol-specific logic
  multiDutSupport: false,
  advancedScoreboard: true, // Reference model
  crossCoverage: true, // Cross-coverage
  constrainedRandom: true, // Constrained-random

  factoryRegistration: true,
  configDb: true,
  resetSequence: true,
  clockingBlocks: true,
};

/**
 * Advanced Mode Configuration
 * Maximum features for complex verification scenarios
 */
export const ADVANCED_MODE: GenerationModeFeatures = {
  multiAgent: true,
  passiveAgents: true,

  scoreboard: true,
  coverage: true,

  sequences: {
    base: true,
    directed: true,
    random: true,
    error: true,
    stress: true, // Include stress sequences
  },

  tests: {
    smoke: true,
    random: true,
    directed: true,
    stress: true, // Include stress tests
  },

  protocolAutoDetection: true,
  protocolSpecificLogic: true,
  multiDutSupport: true, // Support multiple DUTs
  advancedScoreboard: true,
  crossCoverage: true,
  constrainedRandom: true,

  factoryRegistration: true,
  configDb: true,
  resetSequence: true,
  clockingBlocks: true,
};

/**
 * Get feature configuration for a generation mode
 */
export function getGenerationModeFeatures(
  mode: GenerationMode,
): GenerationModeFeatures {
  switch (mode) {
    case "mvp":
      return MVP_MODE;
    case "production":
      return PRODUCTION_MODE;
    case "advanced":
      return ADVANCED_MODE;
    default:
      return PRODUCTION_MODE; // Default to production
  }
}

/**
 * Check if a feature is enabled for a mode
 */
export function isFeatureEnabled(
  mode: GenerationMode,
  featurePath: string,
): boolean {
  const features = getGenerationModeFeatures(mode);
  const parts = featurePath.split(".");

  let current: any = features;
  for (const part of parts) {
    if (current[part] === undefined) {
      return false;
    }
    current = current[part];
  }

  return current === true;
}

/**
 * Get mode description
 */
export function getGenerationModeDescription(mode: GenerationMode): string {
  switch (mode) {
    case "mvp":
      return "Minimal Viable Product - Single agent, basic driver/monitor, one test and sequence. Quick validation.";
    case "production":
      return "Production - Multi-agent, scoreboard, randomization, coverage. Comprehensive verification.";
    case "advanced":
      return "Advanced - All production features plus protocol auto-detection, stress tests, multi-DUT support.";
    default:
      return "Unknown mode";
  }
}

/**
 * Get feature summary for a mode
 */
export function getGenerationModeFeatureSummary(
  mode: GenerationMode,
): string[] {
  const features = getGenerationModeFeatures(mode);
  const summary: string[] = [];

  // Agent configuration
  if (features.multiAgent) {
    summary.push("✓ Multiple agents");
  } else {
    summary.push("✓ Single agent");
  }

  if (features.passiveAgents) {
    summary.push("✓ Passive agents (monitor-only)");
  }

  // Components
  if (features.scoreboard) {
    summary.push("✓ Scoreboard");
  }

  if (features.coverage) {
    summary.push("✓ Functional coverage");
  }

  // Sequences
  const sequenceTypes = Object.entries(features.sequences)
    .filter(([_, enabled]) => enabled)
    .map(([type, _]) => type);
  if (sequenceTypes.length > 0) {
    summary.push(`✓ Sequences: ${sequenceTypes.join(", ")}`);
  }

  // Tests
  const testTypes = Object.entries(features.tests)
    .filter(([_, enabled]) => enabled)
    .map(([type, _]) => type);
  if (testTypes.length > 0) {
    summary.push(`✓ Tests: ${testTypes.join(", ")}`);
  }

  // Advanced features
  if (features.protocolAutoDetection) {
    summary.push("✓ Protocol auto-detection");
  }

  if (features.multiDutSupport) {
    summary.push("✓ Multi-DUT support");
  }

  if (features.constrainedRandom) {
    summary.push("✓ Constrained-random sequences");
  }

  if (features.crossCoverage) {
    summary.push("✓ Cross-coverage");
  }

  return summary;
}

/**
 * Validate generation mode
 */
export function isValidGenerationMode(mode: string): mode is GenerationMode {
  return mode === "mvp" || mode === "production" || mode === "advanced";
}
