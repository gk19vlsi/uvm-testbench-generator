/**
 * Simulator Service
 * Manages simulation execution and simulator detection for various EDA tools
 */

import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import logger from "../config/logger";

const execAsync = promisify(exec);

export type SimulatorType =
  | "modelsim"
  | "vcs"
  | "xcelium"
  | "verilator"
  | "icarus";

export interface SimulationConfig {
  simulator: SimulatorType;
  projectId: string;
  generationId: string;
  testbenchFiles: string[]; // paths to testbench files
  rtlFiles: string[]; // paths to RTL files
  topModule: string;
  runtime: string; // e.g., "1000ns", "10us"
  timescale: string; // e.g., "1ns/1ps"
  plusargs: string[]; // simulator plusargs
  defines: Record<string, string>; // preprocessor defines
  vcdOutputPath: string; // where to save VCD file
}

export interface SimulationResult {
  success: boolean;
  vcdFilePath: string;
  consoleOutput: string;
  errors: SimulationError[];
  warnings: SimulationWarning[];
  duration: number; // execution time in seconds
}

export interface SimulationError {
  file: string;
  line: number;
  message: string;
  severity: "error" | "fatal";
}

export interface SimulationWarning {
  file: string;
  line: number;
  message: string;
}

export interface SimulationProgress {
  phase: "compiling" | "elaborating" | "simulating" | "complete";
  percentage: number; // 0-100
  message: string;
  currentTime?: string; // current simulation time
}

export interface SimulatorInfo {
  type: SimulatorType;
  available: boolean;
  version?: string;
  executable?: string;
}

/**
 * Simulator Service
 * Provides functionality to detect and interact with various HDL simulators
 */
export class SimulatorService {
  // Mapping of simulator types to their executable names
  private readonly simulatorExecutables: Record<SimulatorType, string[]> = {
    modelsim: ["vsim", "vlog", "vcom"],
    vcs: ["vcs", "simv"],
    xcelium: ["xrun", "xmsim"],
    verilator: ["verilator"],
    icarus: ["iverilog", "vvp"],
  };

  // Mapping of simulator types to version check commands
  private readonly versionCommands: Record<SimulatorType, string> = {
    modelsim: "vsim -version",
    vcs: "vcs -ID",
    xcelium: "xrun -version",
    verilator: "verilator --version",
    icarus: "iverilog -V",
  };

  // Progress callback
  private progressCallback?: (progress: SimulationProgress) => void;

  // Track running simulation processes by job ID
  private runningSimulations: Map<
    string,
    { process: any; config: SimulationConfig }
  > = new Map();

  /**
   * Check if a specific simulator is available on the system
   * @param simulator - The simulator type to check
   * @returns Promise<boolean> - True if simulator is available, false otherwise
   */
  async isSimulatorAvailable(simulator: SimulatorType): Promise<boolean> {
    try {
      const executables = this.simulatorExecutables[simulator];

      // Check if at least one of the required executables is available
      for (const executable of executables) {
        try {
          // Try to find the executable in PATH
          const command =
            process.platform === "win32"
              ? `where ${executable}`
              : `which ${executable}`;

          await execAsync(command);
          logger.info(`Simulator ${simulator} is available (${executable})`);
          return true;
        } catch (error) {
          // Continue checking other executables
          continue;
        }
      }

      logger.info(`Simulator ${simulator} is not available`);
      return false;
    } catch (error) {
      logger.error(
        `Error checking simulator availability for ${simulator}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Get the version of a specific simulator
   * @param simulator - The simulator type
   * @returns Promise<string> - The version string, or empty string if not available
   */
  async getSimulatorVersion(simulator: SimulatorType): Promise<string> {
    try {
      const isAvailable = await this.isSimulatorAvailable(simulator);
      if (!isAvailable) {
        logger.warn(
          `Cannot get version for unavailable simulator: ${simulator}`,
        );
        return "";
      }

      const versionCommand = this.versionCommands[simulator];
      const { stdout, stderr } = await execAsync(versionCommand);

      // Parse version from output
      const output = stdout || stderr;
      const version = this.parseVersion(simulator, output);

      logger.info(`Simulator ${simulator} version: ${version}`);
      return version;
    } catch (error: any) {
      logger.error(`Error getting simulator version for ${simulator}:`, error);
      return "";
    }
  }

  /**
   * Get information about all supported simulators
   * @returns Promise<SimulatorInfo[]> - Array of simulator information
   */
  async getAllSimulatorInfo(): Promise<SimulatorInfo[]> {
    const simulatorTypes: SimulatorType[] = [
      "modelsim",
      "vcs",
      "xcelium",
      "verilator",
      "icarus",
    ];

    const infoPromises = simulatorTypes.map(async (type) => {
      const available = await this.isSimulatorAvailable(type);
      const info: SimulatorInfo = {
        type,
        available,
      };

      if (available) {
        info.version = await this.getSimulatorVersion(type);
        info.executable = this.simulatorExecutables[type][0];
      }

      return info;
    });

    return Promise.all(infoPromises);
  }

  /**
   * Parse version string from simulator output
   * @param simulator - The simulator type
   * @param output - The raw output from version command
   * @returns string - Parsed version string
   */
  private parseVersion(simulator: SimulatorType, output: string): string {
    try {
      const lines = output.split("\n");

      switch (simulator) {
        case "modelsim": {
          // ModelSim output: "Model Technology ModelSim SE vsim 10.5 Simulator 2016.04"
          const match = output.match(/vsim\s+(\S+)/i);
          return match ? match[1] : lines[0].trim();
        }

        case "vcs": {
          // VCS output contains version in various formats
          const match = output.match(/vcs[^\d]*(\d+\.\d+(?:\.\d+)?)/i);
          return match ? match[1] : lines[0].trim();
        }

        case "xcelium": {
          // Xcelium output: "Cadence Xcelium Parallel Simulator - 21.09"
          const match = output.match(/xcelium[^\d]*(\d+\.\d+(?:\.\d+)?)/i);
          return match ? match[1] : lines[0].trim();
        }

        case "verilator": {
          // Verilator output: "Verilator 4.228 2022-01-17"
          const match = output.match(/verilator\s+(\d+\.\d+(?:\.\d+)?)/i);
          return match ? match[1] : lines[0].trim();
        }

        case "icarus": {
          // Icarus output: "Icarus Verilog version 11.0 (stable)"
          const match = output.match(/version\s+(\d+\.\d+(?:\.\d+)?)/i);
          return match ? match[1] : lines[0].trim();
        }

        default:
          return lines[0].trim();
      }
    } catch (error) {
      logger.error(`Error parsing version for ${simulator}:`, error);
      return output.split("\n")[0].trim();
    }
  }

  /**
   * Get the primary executable name for a simulator
   * @param simulator - The simulator type
   * @returns string - The primary executable name
   */
  getSimulatorExecutable(simulator: SimulatorType): string {
    return this.simulatorExecutables[simulator][0];
  }

  /**
   * Register callback for simulation progress updates
   * @param callback - Function to call with progress updates
   */
  onProgress(callback: (progress: SimulationProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Emit progress update to registered callback
   * @param progress - Progress information
   */
  private emitProgress(progress: SimulationProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
    logger.info(
      `Simulation progress: ${progress.phase} (${progress.percentage}%) - ${progress.message}`,
    );
  }

  /**
   * Parse simulator output for progress information
   * @param output - Simulator console output
   * @param simulator - Simulator type
   * @returns Current simulation time if found
   */
  private parseSimulationTime(
    output: string,
    simulator: SimulatorType,
  ): string | undefined {
    const lines = output.split("\n");

    for (const line of lines) {
      switch (simulator) {
        case "modelsim": {
          // ModelSim format: "# Time: 1000 ns"
          const match = line.match(/# Time:\s+(\d+\s*\w+)/i);
          if (match) {
            return match[1].trim();
          }
          break;
        }

        case "vcs": {
          // VCS format: "$finish at simulation time 1000ns"
          const match = line.match(/simulation time\s+(\d+\s*\w+)/i);
          if (match) {
            return match[1].trim();
          }
          break;
        }

        case "xcelium": {
          // Xcelium format: "Time: 1000 NS"
          const match = line.match(/Time:\s+(\d+\s*\w+)/i);
          if (match) {
            return match[1].trim();
          }
          break;
        }

        case "verilator": {
          // Verilator doesn't typically output time in console
          // Would need to be implemented in the testbench
          break;
        }

        case "icarus": {
          // Icarus format: "VCD info: dumpfile dump.vcd opened for output."
          // Time info would be in VCD file, not console
          break;
        }
      }
    }

    return undefined;
  }

  /**
   * Calculate percentage completion based on phase
   * @param phase - Current simulation phase
   * @returns Percentage (0-100)
   */
  private calculatePercentage(
    phase: "compiling" | "elaborating" | "simulating" | "complete",
  ): number {
    switch (phase) {
      case "compiling":
        return 25;
      case "elaborating":
        return 50;
      case "simulating":
        return 75;
      case "complete":
        return 100;
      default:
        return 0;
    }
  }

  /**
   * Check if any simulator is available on the system
   * @returns Promise<boolean> - True if at least one simulator is available
   */
  async hasAnySimulator(): Promise<boolean> {
    const simulatorTypes: SimulatorType[] = [
      "modelsim",
      "vcs",
      "xcelium",
      "verilator",
      "icarus",
    ];

    for (const simulator of simulatorTypes) {
      const available = await this.isSimulatorAvailable(simulator);
      if (available) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the first available simulator
   * @returns Promise<SimulatorType | null> - The first available simulator type, or null if none available
   */
  async getFirstAvailableSimulator(): Promise<SimulatorType | null> {
    const simulatorTypes: SimulatorType[] = [
      "modelsim",
      "vcs",
      "xcelium",
      "verilator",
      "icarus",
    ];

    for (const simulator of simulatorTypes) {
      const available = await this.isSimulatorAvailable(simulator);
      if (available) {
        return simulator;
      }
    }

    return null;
  }

  /**
   * Run simulation with specified configuration
   * @param config - Simulation configuration
   * @param jobId - Optional job ID for tracking (defaults to generationId)
   * @returns Promise<SimulationResult> - Simulation result with output and errors
   */
  async runSimulation(
    config: SimulationConfig,
    jobId?: string,
  ): Promise<SimulationResult> {
    const startTime = Date.now();
    let consoleOutput = "";
    const errors: SimulationError[] = [];
    const warnings: SimulationWarning[] = [];
    const simulationJobId = jobId || config.generationId;

    try {
      logger.info(
        `Starting simulation with ${config.simulator} for project ${config.projectId} (job: ${simulationJobId})`,
      );

      // Verify simulator is available
      const isAvailable = await this.isSimulatorAvailable(config.simulator);
      if (!isAvailable) {
        throw new Error(`Simulator ${config.simulator} is not available`);
      }

      // Build simulator commands based on simulator type
      const commands = this.buildSimulatorCommands(config);

      // Execute compile phase
      logger.info("Executing compile phase...");
      this.emitProgress({
        phase: "compiling",
        percentage: this.calculatePercentage("compiling"),
        message: "Compiling design files...",
      });

      const compileResult = await this.executeCommand(
        commands.compile,
        config.projectId,
      );
      consoleOutput += `=== COMPILE PHASE ===\n${compileResult.output}\n\n`;

      // Parse errors and warnings from compile output
      this.parseErrorsAndWarnings(
        compileResult.output,
        config.simulator,
        errors,
        warnings,
      );

      if (!compileResult.success) {
        const duration = (Date.now() - startTime) / 1000;
        this.emitProgress({
          phase: "complete",
          percentage: 100,
          message: "Compilation failed",
        });
        return {
          success: false,
          vcdFilePath: "",
          consoleOutput,
          errors,
          warnings,
          duration,
        };
      }

      // Execute elaborate phase (if applicable)
      if (commands.elaborate) {
        logger.info("Executing elaborate phase...");
        this.emitProgress({
          phase: "elaborating",
          percentage: this.calculatePercentage("elaborating"),
          message: "Elaborating design...",
        });

        const elaborateResult = await this.executeCommand(
          commands.elaborate,
          config.projectId,
        );
        consoleOutput += `=== ELABORATE PHASE ===\n${elaborateResult.output}\n\n`;

        this.parseErrorsAndWarnings(
          elaborateResult.output,
          config.simulator,
          errors,
          warnings,
        );

        if (!elaborateResult.success) {
          const duration = (Date.now() - startTime) / 1000;
          this.emitProgress({
            phase: "complete",
            percentage: 100,
            message: "Elaboration failed",
          });
          return {
            success: false,
            vcdFilePath: "",
            consoleOutput,
            errors,
            warnings,
            duration,
          };
        }
      }

      // Execute simulate phase with process tracking
      logger.info("Executing simulate phase...");
      this.emitProgress({
        phase: "simulating",
        percentage: this.calculatePercentage("simulating"),
        message: "Running simulation...",
      });

      const simulateResult = await this.executeCommandWithTracking(
        commands.simulate,
        config.projectId,
        simulationJobId,
        config,
      );
      consoleOutput += `=== SIMULATE PHASE ===\n${simulateResult.output}\n\n`;

      // Parse simulation time from output
      // For Xcelium, simulation happens during compile phase, so check compile output too
      let currentTime = this.parseSimulationTime(
        simulateResult.output,
        config.simulator,
      );

      if (!currentTime && config.simulator === "xcelium") {
        // For Xcelium, try parsing from compile output
        currentTime = this.parseSimulationTime(
          compileResult.output,
          config.simulator,
        );
      }

      this.parseErrorsAndWarnings(
        simulateResult.output,
        config.simulator,
        errors,
        warnings,
      );

      const duration = (Date.now() - startTime) / 1000;

      // Check if VCD file was generated
      const vcdExists = await this.checkFileExists(config.vcdOutputPath);

      // Emit completion progress
      this.emitProgress({
        phase: "complete",
        percentage: 100,
        message:
          simulateResult.success && vcdExists
            ? "Simulation completed successfully"
            : "Simulation completed with errors",
        currentTime,
      });

      return {
        success: simulateResult.success && vcdExists,
        vcdFilePath: vcdExists ? config.vcdOutputPath : "",
        consoleOutput,
        errors,
        warnings,
        duration,
      };
    } catch (error: any) {
      logger.error("Simulation execution failed:", error);
      const duration = (Date.now() - startTime) / 1000;

      // Clean up tracking if error occurred
      this.runningSimulations.delete(simulationJobId);

      this.emitProgress({
        phase: "complete",
        percentage: 100,
        message: `Simulation failed: ${error.message}`,
      });

      return {
        success: false,
        vcdFilePath: "",
        consoleOutput: consoleOutput + `\n\nERROR: ${error.message}`,
        errors: [
          {
            file: "",
            line: 0,
            message: error.message,
            severity: "fatal",
          },
        ],
        warnings,
        duration,
      };
    }
  }

  /**
   * Build simulator-specific commands for compile, elaborate, and simulate phases
   * @param config - Simulation configuration
   * @returns Object with compile, elaborate, and simulate commands
   */
  private buildSimulatorCommands(config: SimulationConfig): {
    compile: string;
    elaborate?: string;
    simulate: string;
  } {
    const allFiles = [...config.rtlFiles, ...config.testbenchFiles];
    const defines = Object.entries(config.defines)
      .map(([key, value]) => `+define+${key}=${value}`)
      .join(" ");

    switch (config.simulator) {
      case "modelsim": {
        // ModelSim uses vlog for Verilog compilation and vsim for simulation
        const compileCmd = `vlog -timescale ${config.timescale} ${defines} ${allFiles.join(" ")}`;

        // Generate VCD dump commands in a do file
        const vcdCommands = this.generateVCDCommands(
          config.simulator,
          config.topModule,
          config.vcdOutputPath,
        );

        const simulateCmd = `vsim -c -do "${vcdCommands} run ${config.runtime}; quit -f" ${config.topModule} ${config.plusargs.map((arg) => `+${arg}`).join(" ")}`;

        return {
          compile: compileCmd,
          simulate: simulateCmd,
        };
      }

      case "vcs": {
        // VCS combines compilation and elaboration
        const compileCmd = `vcs -timescale=${config.timescale} ${defines} ${allFiles.join(" ")} -o simv`;

        // VCS simulation with VCD dump
        const vcdCommands = this.generateVCDCommands(
          config.simulator,
          config.topModule,
          config.vcdOutputPath,
        );

        const simulateCmd = `./simv ${config.plusargs.map((arg) => `+${arg}`).join(" ")} +vcs+finish+${config.runtime}`;

        return {
          compile: compileCmd,
          simulate: simulateCmd,
        };
      }

      case "xcelium": {
        // Xcelium uses xrun for single-step compilation and simulation
        const vcdCommands = this.generateVCDCommands(
          config.simulator,
          config.topModule,
          config.vcdOutputPath,
        );

        const compileCmd = `xrun -timescale ${config.timescale} ${defines} ${allFiles.join(" ")} -top ${config.topModule} -access +rwc ${config.plusargs.map((arg) => `+${arg}`).join(" ")}`;

        return {
          compile: compileCmd,
          simulate: "", // Xcelium combines compile and simulate
        };
      }

      case "verilator": {
        // Verilator compiles to C++ and then runs
        const compileCmd = `verilator --cc --exe --build -Wall --trace ${defines} ${allFiles.join(" ")} --top-module ${config.topModule}`;

        const simulateCmd = `./obj_dir/V${config.topModule}`;

        return {
          compile: compileCmd,
          simulate: simulateCmd,
        };
      }

      case "icarus": {
        // Icarus Verilog uses iverilog for compilation and vvp for simulation
        const compileCmd = `iverilog -g2012 -timescale=${config.timescale} ${defines} -o simulation.vvp ${allFiles.join(" ")}`;

        const simulateCmd = `vvp simulation.vvp ${config.plusargs.map((arg) => `+${arg}`).join(" ")}`;

        return {
          compile: compileCmd,
          simulate: simulateCmd,
        };
      }

      default:
        throw new Error(`Unsupported simulator: ${config.simulator}`);
    }
  }

  /**
   * Generate VCD dump commands for the specified simulator
   * @param simulator - Simulator type
   * @param topModule - Top module name
   * @param vcdPath - Path to VCD output file
   * @returns VCD dump command string
   */
  private generateVCDCommands(
    simulator: SimulatorType,
    topModule: string,
    vcdPath: string,
  ): string {
    switch (simulator) {
      case "modelsim":
        return `vcd file ${vcdPath}; vcd add -r /*;`;

      case "vcs":
        return `$vcdpluson; $vcdplusfile("${vcdPath}");`;

      case "xcelium":
        return `-input "dump -file ${vcdPath} -type vcd; dump -add ${topModule} -depth all;"`;

      case "verilator":
        return `--trace-fst ${vcdPath}`;

      case "icarus":
        // Icarus requires VCD commands in the testbench itself
        return `$dumpfile("${vcdPath}"); $dumpvars(0, ${topModule});`;

      default:
        return "";
    }
  }

  /**
   * Execute a command and capture output
   * @param command - Command to execute
   * @param workingDir - Working directory for command execution
   * @returns Promise with success status and output
   */
  private async executeCommand(
    command: string,
    workingDir: string,
  ): Promise<{ success: boolean; output: string }> {
    if (!command) {
      return { success: true, output: "" };
    }

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      });

      const output = stdout + stderr;
      return { success: true, output };
    } catch (error: any) {
      // Command failed, but we still want to capture the output
      const output = (error.stdout || "") + (error.stderr || "");
      return { success: false, output };
    }
  }

  /**
   * Execute a command with process tracking for cancellation support
   * @param command - Command to execute
   * @param workingDir - Working directory for command execution
   * @param jobId - Job ID for tracking
   * @param config - Simulation configuration
   * @returns Promise with success status, output, and process handle
   */
  private async executeCommandWithTracking(
    command: string,
    workingDir: string,
    jobId: string,
    config: SimulationConfig,
  ): Promise<{ success: boolean; output: string; process?: ChildProcess }> {
    if (!command) {
      return { success: true, output: "" };
    }

    return new Promise((resolve) => {
      let output = "";
      let hasResolved = false;

      // Parse command into executable and args
      const parts = command.split(" ");
      const executable = parts[0];
      const args = parts.slice(1);

      // Spawn process with detached option for process group management
      const childProcess = spawn(executable, args, {
        cwd: workingDir,
        detached: process.platform !== "win32", // Use process groups on Unix
        shell: true, // Use shell to handle complex commands
      });

      // Track the process
      this.runningSimulations.set(jobId, {
        process: childProcess,
        config,
      });

      // Capture stdout
      childProcess.stdout?.on("data", (data) => {
        output += data.toString();
      });

      // Capture stderr
      childProcess.stderr?.on("data", (data) => {
        output += data.toString();
      });

      // Handle process completion
      childProcess.on("close", (code) => {
        if (!hasResolved) {
          hasResolved = true;
          // Remove from tracking when complete
          this.runningSimulations.delete(jobId);

          resolve({
            success: code === 0,
            output,
            process: childProcess,
          });
        }
      });

      // Handle process errors
      childProcess.on("error", (error) => {
        if (!hasResolved) {
          hasResolved = true;
          // Remove from tracking on error
          this.runningSimulations.delete(jobId);

          output += `\nProcess error: ${error.message}`;
          resolve({
            success: false,
            output,
            process: childProcess,
          });
        }
      });
    });
  }

  /**
   * Parse errors and warnings from simulator output
   * @param output - Simulator console output
   * @param simulator - Simulator type
   * @param errors - Array to populate with errors
   * @param warnings - Array to populate with warnings
   */
  private parseErrorsAndWarnings(
    output: string,
    simulator: SimulatorType,
    errors: SimulationError[],
    warnings: SimulationWarning[],
  ): void {
    const lines = output.split("\n");

    for (const line of lines) {
      // Parse simulator-specific error formats
      switch (simulator) {
        case "modelsim": {
          // ModelSim format: ** Error: file.v(123): message
          const errorMatch = line.match(
            /\*\*\s+(Error|Fatal):\s+([^(]+)\((\d+)\):\s+(.+)/i,
          );
          if (errorMatch) {
            errors.push({
              file: errorMatch[2].trim(),
              line: parseInt(errorMatch[3]),
              message: errorMatch[4].trim(),
              severity: errorMatch[1].toLowerCase() as "error" | "fatal",
            });
          }

          // ModelSim warning: ** Warning: file.v(123): message
          const warningMatch = line.match(
            /\*\*\s+Warning:\s+([^(]+)\((\d+)\):\s+(.+)/i,
          );
          if (warningMatch) {
            warnings.push({
              file: warningMatch[1].trim(),
              line: parseInt(warningMatch[2]),
              message: warningMatch[3].trim(),
            });
          }
          break;
        }

        case "vcs": {
          // VCS format: Error-[CODE] file.v, line 123: message
          const errorMatch = line.match(
            /Error-\[.+\]\s+([^,]+),\s+line\s+(\d+):\s+(.+)/i,
          );
          if (errorMatch) {
            errors.push({
              file: errorMatch[1].trim(),
              line: parseInt(errorMatch[2]),
              message: errorMatch[3].trim(),
              severity: "error",
            });
          }

          // VCS warning: Warning-[CODE] file.v, line 123: message
          const warningMatch = line.match(
            /Warning-\[.+\]\s+([^,]+),\s+line\s+(\d+):\s+(.+)/i,
          );
          if (warningMatch) {
            warnings.push({
              file: warningMatch[1].trim(),
              line: parseInt(warningMatch[2]),
              message: warningMatch[3].trim(),
            });
          }
          break;
        }

        case "xcelium": {
          // Xcelium format: xmvlog: *E,CODE (file.v,123): message
          const errorMatch = line.match(
            /xm\w+:\s+\*E,\w+\s+\(([^,]+),(\d+)\):\s+(.+)/i,
          );
          if (errorMatch) {
            errors.push({
              file: errorMatch[1].trim(),
              line: parseInt(errorMatch[2]),
              message: errorMatch[3].trim(),
              severity: "error",
            });
          }

          // Xcelium warning: xmvlog: *W,CODE (file.v,123): message
          const warningMatch = line.match(
            /xm\w+:\s+\*W,\w+\s+\(([^,]+),(\d+)\):\s+(.+)/i,
          );
          if (warningMatch) {
            warnings.push({
              file: warningMatch[1].trim(),
              line: parseInt(warningMatch[2]),
              message: warningMatch[3].trim(),
            });
          }
          break;
        }

        case "verilator": {
          // Verilator format: %Error: file.v:123: message
          const errorMatch = line.match(/%Error:\s+([^:]+):(\d+):\s+(.+)/i);
          if (errorMatch) {
            errors.push({
              file: errorMatch[1].trim(),
              line: parseInt(errorMatch[2]),
              message: errorMatch[3].trim(),
              severity: "error",
            });
          }

          // Verilator warning: %Warning: file.v:123: message
          const warningMatch = line.match(
            /%Warning[^:]*:\s+([^:]+):(\d+):\s+(.+)/i,
          );
          if (warningMatch) {
            warnings.push({
              file: warningMatch[1].trim(),
              line: parseInt(warningMatch[2]),
              message: warningMatch[3].trim(),
            });
          }
          break;
        }

        case "icarus": {
          // Icarus format: file.v:123: error: message
          const errorMatch = line.match(/([^:]+):(\d+):\s+error:\s+(.+)/i);
          if (errorMatch) {
            errors.push({
              file: errorMatch[1].trim(),
              line: parseInt(errorMatch[2]),
              message: errorMatch[3].trim(),
              severity: "error",
            });
          }

          // Icarus warning: file.v:123: warning: message
          const warningMatch = line.match(/([^:]+):(\d+):\s+warning:\s+(.+)/i);
          if (warningMatch) {
            warnings.push({
              file: warningMatch[1].trim(),
              line: parseInt(warningMatch[2]),
              message: warningMatch[3].trim(),
            });
          }
          break;
        }
      }
    }
  }

  /**
   * Check if a file exists
   * @param filePath - Path to file
   * @returns Promise<boolean> - True if file exists
   */
  private async checkFileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cancel a running simulation
   * @param jobId - The unique identifier for the simulation job
   * @returns Promise<void>
   */
  async cancelSimulation(jobId: string): Promise<void> {
    const simulation = this.runningSimulations.get(jobId);

    if (!simulation) {
      logger.warn(`No running simulation found with job ID: ${jobId}`);
      return;
    }

    try {
      logger.info(`Canceling simulation job: ${jobId}`);

      // Kill the process and all its children
      if (simulation.process && !simulation.process.killed) {
        // On Unix systems, kill the entire process group
        if (process.platform !== "win32") {
          try {
            // Send SIGTERM to the process group
            process.kill(-simulation.process.pid, "SIGTERM");
            logger.info(
              `Sent SIGTERM to process group ${simulation.process.pid}`,
            );

            // Wait a bit for graceful shutdown
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // If still running, force kill
            if (!simulation.process.killed) {
              process.kill(-simulation.process.pid, "SIGKILL");
              logger.info(
                `Sent SIGKILL to process group ${simulation.process.pid}`,
              );
            }
          } catch (error: any) {
            // Process might already be dead
            if (error.code !== "ESRCH") {
              logger.error(`Error killing process group:`, error);
            }
          }
        } else {
          // On Windows, use taskkill to kill the process tree
          try {
            await execAsync(`taskkill /pid ${simulation.process.pid} /T /F`);
            logger.info(
              `Killed process tree for PID ${simulation.process.pid}`,
            );
          } catch (error) {
            logger.error(`Error killing process tree:`, error);
          }
        }
      }

      // Clean up partial VCD file if it exists
      await this.cleanupPartialVCD(simulation.config.vcdOutputPath);

      // Remove from tracking
      this.runningSimulations.delete(jobId);

      logger.info(`Successfully canceled simulation job: ${jobId}`);
    } catch (error) {
      logger.error(`Error canceling simulation ${jobId}:`, error);
      // Still remove from tracking even if cleanup failed
      this.runningSimulations.delete(jobId);
      throw error;
    }
  }

  /**
   * Clean up partial VCD file from canceled simulation
   * @param vcdPath - Path to the VCD file
   */
  private async cleanupPartialVCD(vcdPath: string): Promise<void> {
    try {
      const exists = await this.checkFileExists(vcdPath);

      if (exists) {
        logger.info(`Cleaning up partial VCD file: ${vcdPath}`);
        await fs.unlink(vcdPath);
        logger.info(`Successfully deleted partial VCD file: ${vcdPath}`);
      }
    } catch (error) {
      logger.error(`Error cleaning up VCD file ${vcdPath}:`, error);
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Get list of running simulation job IDs
   * @returns Array of job IDs
   */
  getRunningSimulations(): string[] {
    return Array.from(this.runningSimulations.keys());
  }

  /**
   * Check if a simulation is currently running
   * @param jobId - The simulation job ID
   * @returns boolean - True if simulation is running
   */
  isSimulationRunning(jobId: string): boolean {
    return this.runningSimulations.has(jobId);
  }
}

// Export singleton instance
export const simulatorService = new SimulatorService();
export default simulatorService;
