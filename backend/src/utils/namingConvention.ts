/**
 * UVM Component Naming Convention Utilities
 *
 * Provides consistent naming for UVM components and config_db paths
 * Requirements: 6.1-6.3, 23.4
 */

/**
 * Generate interface name from agent name or protocol
 */
export function generateInterfaceName(
  agentName: string,
  protocol?: string,
): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_if`;
}

/**
 * Generate driver name from agent name
 */
export function generateDriverName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_driver`;
}

/**
 * Generate monitor name from agent name
 */
export function generateMonitorName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_monitor`;
}

/**
 * Generate sequencer name from agent name
 */
export function generateSequencerName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_sequencer`;
}

/**
 * Generate environment name from top module name
 */
export function generateEnvironmentName(topModule: string): string {
  return `${topModule}_env`;
}

/**
 * Generate scoreboard name from top module name
 */
export function generateScoreboardName(topModule: string): string {
  return `${topModule}_scoreboard`;
}

/**
 * Generate coverage name from agent name
 */
export function generateCoverageName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_coverage`;
}

/**
 * Generate sequence name from scenario name
 */
export function generateSequenceName(scenarioName: string): string {
  const sanitized = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
  return `${sanitized}_seq`;
}

/**
 * Generate test name from scenario name
 */
export function generateTestName(scenarioName: string): string {
  const sanitized = scenarioName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
  return `${sanitized}_test`;
}

/**
 * Generate config_db path for virtual interface
 * Format: "uvm_test_top.env.agent_name.vif"
 */
export function generateConfigDbPath(
  agentName: string,
  interfaceName?: string,
): string {
  const baseName = agentName.replace("_agent", "");
  const ifName = interfaceName || generateInterfaceName(agentName);

  // Generate unique path: uvm_test_top.env.agent_name.vif
  return `uvm_test_top.env.${agentName}.vif`;
}

/**
 * Generate unique config_db paths for multiple interfaces
 * Ensures no path collisions
 */
export function generateUniqueConfigDbPaths(
  agentNames: string[],
): Map<string, string> {
  const paths = new Map<string, string>();
  const usedPaths = new Set<string>();

  for (const agentName of agentNames) {
    let path = generateConfigDbPath(agentName);
    let counter = 1;

    // Ensure uniqueness
    while (usedPaths.has(path)) {
      path = `uvm_test_top.env.${agentName}_${counter}.vif`;
      counter++;
    }

    paths.set(agentName, path);
    usedPaths.add(path);
  }

  return paths;
}

/**
 * Generate transaction type name from agent name
 */
export function generateTransactionTypeName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_transaction`;
}

/**
 * Generate config object name from agent name
 */
export function generateConfigObjectName(agentName: string): string {
  const baseName = agentName.replace("_agent", "");
  return `${baseName}_config`;
}

/**
 * Naming convention summary for documentation
 */
export const NAMING_CONVENTION = {
  interface: (agentName: string) => `${agentName.replace("_agent", "")}_if`,
  driver: (agentName: string) => `${agentName.replace("_agent", "")}_driver`,
  monitor: (agentName: string) => `${agentName.replace("_agent", "")}_monitor`,
  sequencer: (agentName: string) =>
    `${agentName.replace("_agent", "")}_sequencer`,
  agent: (agentName: string) => agentName,
  env: (topModule: string) => `${topModule}_env`,
  scoreboard: (topModule: string) => `${topModule}_scoreboard`,
  sequence: (scenario: string) =>
    `${scenario.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_seq`,
  test: (scenario: string) =>
    `${scenario.toLowerCase().replace(/[^a-z0-9_]/g, "_")}_test`,
  transaction: (agentName: string) =>
    `${agentName.replace("_agent", "")}_transaction`,
  config: (agentName: string) => `${agentName.replace("_agent", "")}_config`,
  configDbPath: (agentName: string) => `uvm_test_top.env.${agentName}.vif`,
} as const;
