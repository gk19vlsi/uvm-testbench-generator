/**
 * UVM Component Naming Conventions
 *
 * Provides utilities for generating consistent names for UVM components
 * and config_db paths.
 *
 * Requirements: 6.1-6.3, 23.4
 */

/**
 * Naming convention for UVM components
 */
export class NamingConvention {
  /**
   * Generate interface name
   * @param protocol Protocol name (e.g., "AXI", "UART")
   * @returns Interface name (e.g., "axi_if")
   */
  static interfaceName(protocol: string): string {
    return `${protocol.toLowerCase()}_if`;
  }

  /**
   * Generate driver name
   * @param agentName Agent name (e.g., "axi_master_agent")
   * @returns Driver name (e.g., "axi_master_driver")
   */
  static driverName(agentName: string): string {
    return agentName.replace("_agent", "_driver");
  }

  /**
   * Generate monitor name
   * @param agentName Agent name (e.g., "axi_master_agent")
   * @returns Monitor name (e.g., "axi_master_monitor")
   */
  static monitorName(agentName: string): string {
    return agentName.replace("_agent", "_monitor");
  }

  /**
   * Generate sequencer name
   * @param agentName Agent name (e.g., "axi_master_agent")
   * @returns Sequencer name (e.g., "axi_master_sequencer")
   */
  static sequencerName(agentName: string): string {
    return agentName.replace("_agent", "_sequencer");
  }

  /**
   * Generate agent name
   * @param protocol Protocol name (e.g., "AXI")
   * @param role Role (e.g., "master", "slave")
   * @returns Agent name (e.g., "axi_master_agent")
   */
  static agentName(protocol: string, role?: string): string {
    const base = protocol.toLowerCase();
    if (role) {
      return `${base}_${role.toLowerCase()}_agent`;
    }
    return `${base}_agent`;
  }

  /**
   * Generate environment name
   * @param dutName DUT module name
   * @returns Environment name (e.g., "dut_env")
   */
  static environmentName(dutName: string): string {
    return `${dutName}_env`;
  }

  /**
   * Generate scoreboard name
   * @param dutName DUT module name
   * @returns Scoreboard name (e.g., "dut_scoreboard")
   */
  static scoreboardName(dutName: string): string {
    return `${dutName}_scoreboard`;
  }

  /**
   * Generate sequence name
   * @param scenario Scenario name (e.g., "write_burst")
   * @returns Sequence name (e.g., "write_burst_seq")
   */
  static sequenceName(scenario: string): string {
    return `${scenario.toLowerCase().replace(/\s+/g, "_")}_seq`;
  }

  /**
   * Generate test name
   * @param scenario Scenario name (e.g., "smoke")
   * @returns Test name (e.g., "smoke_test")
   */
  static testName(scenario: string): string {
    return `${scenario.toLowerCase().replace(/\s+/g, "_")}_test`;
  }

  /**
   * Generate coverage name
   * @param agentName Agent name (e.g., "axi_master_agent")
   * @returns Coverage name (e.g., "axi_master_coverage")
   */
  static coverageName(agentName: string): string {
    return agentName.replace("_agent", "_coverage");
  }

  /**
   * Generate transaction name
   * @param protocol Protocol name (e.g., "AXI")
   * @param transactionType Transaction type (e.g., "write")
   * @returns Transaction name (e.g., "axi_write_transaction")
   */
  static transactionName(protocol: string, transactionType?: string): string {
    const base = protocol.toLowerCase();
    if (transactionType) {
      return `${base}_${transactionType.toLowerCase()}_transaction`;
    }
    return `${base}_transaction`;
  }

  /**
   * Generate package name
   * @param dutName DUT module name
   * @returns Package name (e.g., "dut_pkg")
   */
  static packageName(dutName: string): string {
    return `${dutName}_pkg`;
  }

  /**
   * Generate top module name
   * @param dutName DUT module name
   * @returns Top module name (e.g., "tb_top")
   */
  static topModuleName(dutName: string): string {
    return "tb_top";
  }
}

/**
 * Config DB path generator
 *
 * Generates unique config_db paths for virtual interfaces and configuration objects
 */
export class ConfigDBPathGenerator {
  private static usedPaths = new Set<string>();

  /**
   * Reset the used paths (useful for testing)
   */
  static reset(): void {
    this.usedPaths.clear();
  }

  /**
   * Generate config_db path for virtual interface
   * @param componentPath Component hierarchy path (e.g., "uvm_test_top.env.axi_agent")
   * @param interfaceName Interface name (e.g., "axi_if")
   * @returns Config DB path (e.g., "uvm_test_top.env.axi_agent.vif")
   */
  static virtualInterfacePath(
    componentPath: string,
    interfaceName: string,
  ): string {
    const path = `${componentPath}.vif`;
    this.usedPaths.add(path);
    return path;
  }

  /**
   * Generate config_db path for configuration object
   * @param componentPath Component hierarchy path
   * @param configType Configuration type (e.g., "agent_config")
   * @returns Config DB path
   */
  static configObjectPath(componentPath: string, configType: string): string {
    const path = `${componentPath}.${configType}`;
    this.usedPaths.add(path);
    return path;
  }

  /**
   * Generate config_db set call for virtual interface
   * @param interfaceName Interface name
   * @param componentPath Component path where interface should be retrieved
   * @returns SystemVerilog code for config_db set
   */
  static generateSetCall(interfaceName: string, componentPath: string): string {
    const path = this.virtualInterfacePath(componentPath, interfaceName);
    return `uvm_config_db#(virtual ${interfaceName})::set(null, "${componentPath}", "vif", ${interfaceName}_inst);`;
  }

  /**
   * Generate config_db get call for virtual interface
   * @param interfaceName Interface name
   * @param componentPath Component path (typically "this" or empty for current component)
   * @param variableName Variable name to store the interface
   * @returns SystemVerilog code for config_db get
   */
  static generateGetCall(
    interfaceName: string,
    componentPath: string,
    variableName: string,
  ): string {
    return `if (!uvm_config_db#(virtual ${interfaceName})::get(this, "", "vif", ${variableName}))
  \`uvm_fatal(get_type_name(), "Virtual interface not found in config_db")`;
  }

  /**
   * Check if a path is unique
   * @param path Config DB path to check
   * @returns True if path is unique, false otherwise
   */
  static isUnique(path: string): boolean {
    return !this.usedPaths.has(path);
  }

  /**
   * Get all used paths
   * @returns Array of all used config_db paths
   */
  static getAllPaths(): string[] {
    return Array.from(this.usedPaths);
  }

  /**
   * Generate hierarchical component path
   * @param components Array of component names from top to bottom
   * @returns Hierarchical path (e.g., "uvm_test_top.env.axi_agent.driver")
   */
  static buildComponentPath(components: string[]): string {
    return ["uvm_test_top", ...components].join(".");
  }

  /**
   * Generate config_db paths for all agents in environment
   * @param envName Environment name
   * @param agentNames Array of agent names
   * @returns Map of agent names to their config_db paths
   */
  static generateAgentPaths(
    envName: string,
    agentNames: string[],
  ): Map<string, string> {
    const paths = new Map<string, string>();

    for (const agentName of agentNames) {
      const componentPath = this.buildComponentPath([envName, agentName]);
      const interfaceName = NamingConvention.interfaceName(
        agentName.replace("_agent", ""),
      );
      const path = this.virtualInterfacePath(componentPath, interfaceName);
      paths.set(agentName, path);
    }

    return paths;
  }
}

/**
 * File path generator for UVM components
 */
export class FilePathGenerator {
  /**
   * Generate file path for interface
   * @param interfaceName Interface name
   * @returns File path (e.g., "interfaces/axi_if.sv")
   */
  static interfacePath(interfaceName: string): string {
    return `interfaces/${interfaceName}.sv`;
  }

  /**
   * Generate file path for driver
   * @param driverName Driver name
   * @param agentName Agent name (for directory)
   * @returns File path (e.g., "agents/axi_master/axi_master_driver.sv")
   */
  static driverPath(driverName: string, agentName: string): string {
    const agentDir = agentName.replace("_agent", "");
    return `agents/${agentDir}/${driverName}.sv`;
  }

  /**
   * Generate file path for monitor
   * @param monitorName Monitor name
   * @param agentName Agent name (for directory)
   * @returns File path (e.g., "agents/axi_master/axi_master_monitor.sv")
   */
  static monitorPath(monitorName: string, agentName: string): string {
    const agentDir = agentName.replace("_agent", "");
    return `agents/${agentDir}/${monitorName}.sv`;
  }

  /**
   * Generate file path for sequencer
   * @param sequencerName Sequencer name
   * @param agentName Agent name (for directory)
   * @returns File path (e.g., "agents/axi_master/axi_master_sequencer.sv")
   */
  static sequencerPath(sequencerName: string, agentName: string): string {
    const agentDir = agentName.replace("_agent", "");
    return `agents/${agentDir}/${sequencerName}.sv`;
  }

  /**
   * Generate file path for agent
   * @param agentName Agent name
   * @returns File path (e.g., "agents/axi_master/axi_master_agent.sv")
   */
  static agentPath(agentName: string): string {
    const agentDir = agentName.replace("_agent", "");
    return `agents/${agentDir}/${agentName}.sv`;
  }

  /**
   * Generate file path for environment
   * @param envName Environment name
   * @returns File path (e.g., "env/dut_env.sv")
   */
  static environmentPath(envName: string): string {
    return `env/${envName}.sv`;
  }

  /**
   * Generate file path for scoreboard
   * @param scoreboardName Scoreboard name
   * @returns File path (e.g., "scoreboard/dut_scoreboard.sv")
   */
  static scoreboardPath(scoreboardName: string): string {
    return `scoreboard/${scoreboardName}.sv`;
  }

  /**
   * Generate file path for sequence
   * @param sequenceName Sequence name
   * @returns File path (e.g., "sequences/write_burst_seq.sv")
   */
  static sequencePath(sequenceName: string): string {
    return `sequences/${sequenceName}.sv`;
  }

  /**
   * Generate file path for test
   * @param testName Test name
   * @returns File path (e.g., "tests/smoke_test.sv")
   */
  static testPath(testName: string): string {
    return `tests/${testName}.sv`;
  }

  /**
   * Generate file path for top module
   * @returns File path (e.g., "tb_top.sv")
   */
  static topModulePath(): string {
    return "tb_top.sv";
  }

  /**
   * Generate file path for package
   * @param packageName Package name
   * @returns File path (e.g., "dut_pkg.sv")
   */
  static packagePath(packageName: string): string {
    return `${packageName}.sv`;
  }

  /**
   * Generate file path for README
   * @returns File path (e.g., "README.md")
   */
  static readmePath(): string {
    return "README.md";
  }
}
