/**
 * Unit tests for SimulatorService
 */

import {
  SimulatorService,
  SimulationConfig,
} from "../services/SimulatorService";
import { exec } from "child_process";
import * as fs from "fs/promises";

// Mock child_process module
jest.mock("child_process");
jest.mock("fs/promises");

const mockExec = exec as jest.MockedFunction<typeof exec>;
const mockFsAccess = fs.access as jest.MockedFunction<typeof fs.access>;

describe("SimulatorService", () => {
  let service: SimulatorService;

  beforeEach(() => {
    service = new SimulatorService();
    jest.clearAllMocks();
  });

  describe("isSimulatorAvailable", () => {
    it("should return true when ModelSim is available", async () => {
      // Mock successful which/where command
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("modelsim");
      expect(result).toBe(true);
    });

    it("should return true when VCS is available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/vcs", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("vcs");
      expect(result).toBe(true);
    });

    it("should return true when Xcelium is available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/xrun", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("xcelium");
      expect(result).toBe(true);
    });

    it("should return true when Verilator is available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/verilator", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("verilator");
      expect(result).toBe(true);
    });

    it("should return true when Icarus is available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/iverilog", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("icarus");
      expect(result).toBe(true);
    });

    it("should return false when simulator is not available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Command not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("modelsim");
      expect(result).toBe(false);
    });

    it("should check multiple executables for a simulator", async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callCount++;
        if (callCount === 1) {
          // First executable (vsim) not found
          callback(new Error("Command not found"), { stdout: "", stderr: "" });
        } else {
          // Second executable (vlog) found
          callback(null, { stdout: "/usr/bin/vlog", stderr: "" });
        }
        return {} as any;
      });

      const result = await service.isSimulatorAvailable("modelsim");
      expect(result).toBe(true);
    });
  });

  describe("getSimulatorVersion", () => {
    it("should return ModelSim version", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmd.includes("vsim -version")) {
          callback(null, {
            stdout: "Model Technology ModelSim SE vsim 10.5 Simulator 2016.04",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("modelsim");
      expect(version).toBe("10.5");
    });

    it("should return VCS version", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/vcs", stderr: "" });
        } else if (cmd.includes("vcs -ID")) {
          callback(null, {
            stdout: "VCS version 2021.09",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("vcs");
      expect(version).toBe("2021.09");
    });

    it("should return Xcelium version", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/xrun", stderr: "" });
        } else if (cmd.includes("xrun -version")) {
          callback(null, {
            stdout: "Cadence Xcelium Parallel Simulator - 21.09",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("xcelium");
      expect(version).toBe("21.09");
    });

    it("should return Verilator version", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/verilator", stderr: "" });
        } else if (cmd.includes("verilator --version")) {
          callback(null, {
            stdout: "Verilator 4.228 2022-01-17",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("verilator");
      expect(version).toBe("4.228");
    });

    it("should return Icarus version", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/iverilog", stderr: "" });
        } else if (cmd.includes("iverilog -V")) {
          callback(null, {
            stdout: "Icarus Verilog version 11.0 (stable)",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("icarus");
      expect(version).toBe("11.0");
    });

    it("should return empty string when simulator is not available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Command not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const version = await service.getSimulatorVersion("modelsim");
      expect(version).toBe("");
    });

    it("should handle version command errors gracefully", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        if (cmd.includes("which") || cmd.includes("where")) {
          callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else {
          callback(new Error("Version command failed"), {
            stdout: "",
            stderr: "",
          });
        }
        return {} as any;
      });

      const version = await service.getSimulatorVersion("modelsim");
      expect(version).toBe("");
    });
  });

  describe("getAllSimulatorInfo", () => {
    it("should return info for all simulators", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes("which vsim") || cmdStr.includes("where vsim")) {
          callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vsim -version")) {
          callback(null, {
            stdout: "Model Technology ModelSim SE vsim 10.5 Simulator 2016.04",
            stderr: "",
          });
        } else {
          callback(new Error("Not found"), { stdout: "", stderr: "" });
        }
        return {} as any;
      });

      const info = await service.getAllSimulatorInfo();
      expect(info).toHaveLength(5);
      expect(info[0].type).toBe("modelsim");
      expect(info[0].available).toBe(true);
      expect(info[0].version).toBe("10.5");
      expect(info[0].executable).toBe("vsim");
    });

    it("should mark unavailable simulators correctly", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const info = await service.getAllSimulatorInfo();
      expect(info).toHaveLength(5);
      info.forEach((sim) => {
        expect(sim.available).toBe(false);
        expect(sim.version).toBeUndefined();
      });
    });
  });

  describe("getSimulatorExecutable", () => {
    it("should return correct executable for ModelSim", () => {
      expect(service.getSimulatorExecutable("modelsim")).toBe("vsim");
    });

    it("should return correct executable for VCS", () => {
      expect(service.getSimulatorExecutable("vcs")).toBe("vcs");
    });

    it("should return correct executable for Xcelium", () => {
      expect(service.getSimulatorExecutable("xcelium")).toBe("xrun");
    });

    it("should return correct executable for Verilator", () => {
      expect(service.getSimulatorExecutable("verilator")).toBe("verilator");
    });

    it("should return correct executable for Icarus", () => {
      expect(service.getSimulatorExecutable("icarus")).toBe("iverilog");
    });
  });

  describe("hasAnySimulator", () => {
    it("should return true when at least one simulator is available", async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callCount++;
        if (callCount <= 6) {
          // First simulator not found (3 executables for modelsim)
          callback(new Error("Not found"), { stdout: "", stderr: "" });
        } else {
          // Second simulator found
          callback(null, { stdout: "/usr/bin/vcs", stderr: "" });
        }
        return {} as any;
      });

      const result = await service.hasAnySimulator();
      expect(result).toBe(true);
    });

    it("should return false when no simulators are available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const result = await service.hasAnySimulator();
      expect(result).toBe(false);
    });
  });

  describe("getFirstAvailableSimulator", () => {
    it("should return the first available simulator", async () => {
      let callCount = 0;
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callCount++;
        if (callCount <= 3) {
          // ModelSim not found
          callback(new Error("Not found"), { stdout: "", stderr: "" });
        } else {
          // VCS found
          callback(null, { stdout: "/usr/bin/vcs", stderr: "" });
        }
        return {} as any;
      });

      const result = await service.getFirstAvailableSimulator();
      expect(result).toBe("vcs");
    });

    it("should return null when no simulators are available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const result = await service.getFirstAvailableSimulator();
      expect(result).toBeNull();
    });

    it("should return modelsim when it is available", async () => {
      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        return {} as any;
      });

      const result = await service.getFirstAvailableSimulator();
      expect(result).toBe("modelsim");
    });
  });

  describe("runSimulation", () => {
    const baseConfig: SimulationConfig = {
      simulator: "modelsim",
      projectId: "test-project",
      generationId: "test-gen",
      testbenchFiles: ["testbench.sv"],
      rtlFiles: ["design.sv"],
      topModule: "testbench",
      runtime: "1000ns",
      timescale: "1ns/1ps",
      plusargs: ["VERBOSE=1"],
      defines: { DEBUG: "1" },
      vcdOutputPath: "/tmp/output.vcd",
    };

    beforeEach(() => {
      // Mock VCD file exists
      mockFsAccess.mockResolvedValue(undefined);
    });

    it("should successfully run ModelSim simulation", async () => {
      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          cb(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("vsim")) {
          cb(null, { stdout: "Simulation complete\n", stderr: "" });
        }
        return {} as any;
      });

      const result = await service.runSimulation(baseConfig);

      expect(result.success).toBe(true);
      expect(result.vcdFilePath).toBe("/tmp/output.vcd");
      expect(result.consoleOutput).toContain("COMPILE PHASE");
      expect(result.consoleOutput).toContain("SIMULATE PHASE");
      expect(result.errors).toHaveLength(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it("should emit progress updates during simulation", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          cb(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("vsim")) {
          cb(null, {
            stdout: "Simulation complete\n# Time: 1000 ns\n",
            stderr: "",
          });
        }
        return {} as any;
      });

      await service.runSimulation(baseConfig);

      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check for compiling phase
      const compilingUpdate = progressUpdates.find(
        (u) => u.phase === "compiling",
      );
      expect(compilingUpdate).toBeDefined();
      expect(compilingUpdate.percentage).toBe(25);
      expect(compilingUpdate.message).toContain("Compiling");

      // Check for simulating phase
      const simulatingUpdate = progressUpdates.find(
        (u) => u.phase === "simulating",
      );
      expect(simulatingUpdate).toBeDefined();
      expect(simulatingUpdate.percentage).toBe(75);
      expect(simulatingUpdate.message).toContain("Running simulation");

      // Check for complete phase
      const completeUpdate = progressUpdates.find(
        (u) => u.phase === "complete",
      );
      expect(completeUpdate).toBeDefined();
      expect(completeUpdate.percentage).toBe(100);
      expect(completeUpdate.currentTime).toBe("1000 ns");
    });

    it("should emit elaborating phase for VCS simulator", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      const vcsConfig = { ...baseConfig, simulator: "vcs" as const };

      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vcs", stderr: "" });
        } else if (cmdStr.includes("vcs")) {
          cb(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("./simv")) {
          cb(null, { stdout: "Simulation complete\n", stderr: "" });
        }
        return {} as any;
      });

      await service.runSimulation(vcsConfig);

      // VCS doesn't have separate elaborate phase, so we should only see compiling, simulating, complete
      const phases = progressUpdates.map((u) => u.phase);
      expect(phases).toContain("compiling");
      expect(phases).toContain("simulating");
      expect(phases).toContain("complete");
    });

    it("should parse simulation time from ModelSim output", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          cb(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("vsim")) {
          cb(null, {
            stdout: "Simulation running\n# Time: 500 ns\nSimulation complete\n",
            stderr: "",
          });
        }
        return {} as any;
      });

      await service.runSimulation(baseConfig);

      const completeUpdate = progressUpdates.find(
        (u) => u.phase === "complete",
      );
      expect(completeUpdate.currentTime).toBe("500 ns");
    });

    it("should parse simulation time from VCS output", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      const vcsConfig = { ...baseConfig, simulator: "vcs" as const };

      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vcs", stderr: "" });
        } else if (cmdStr.includes("vcs") && !cmdStr.includes("./simv")) {
          cb(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("./simv") || cmdStr.includes("simv")) {
          cb(null, {
            stdout: "$finish at simulation time 1000ns\n",
            stderr: "",
          });
        } else {
          cb(null, { stdout: "", stderr: "" });
        }
        return {} as any;
      });

      await service.runSimulation(vcsConfig);

      const completeUpdate = progressUpdates.find(
        (u) => u.phase === "complete",
      );
      expect(completeUpdate).toBeDefined();
      expect(completeUpdate.currentTime).toBe("1000ns");
    });

    it("should parse simulation time from Xcelium output", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      const xceliumConfig = { ...baseConfig, simulator: "xcelium" as const };

      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/xrun", stderr: "" });
        } else if (cmdStr.includes("xrun")) {
          cb(null, {
            stdout: "Simulation running\nTime: 750 NS\nSimulation complete\n",
            stderr: "",
          });
        }
        return {} as any;
      });

      await service.runSimulation(xceliumConfig);

      const completeUpdate = progressUpdates.find(
        (u) => u.phase === "complete",
      );
      expect(completeUpdate).toBeDefined();
      expect(completeUpdate.currentTime).toBe("750 NS");
    });

    it("should emit failure progress on compilation error", async () => {
      const progressUpdates: any[] = [];

      service.onProgress((progress) => {
        progressUpdates.push(progress);
      });

      mockExec.mockImplementation((cmd: any, callback: any) => {
        const cmdStr = String(cmd);

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          const error: any = new Error("Compilation failed");
          error.stdout = "";
          error.stderr = "** Error: design.sv(42): Syntax error\n";
          callback(error);
        }
        return {} as any;
      });

      await service.runSimulation(baseConfig);

      const completeUpdate = progressUpdates.find(
        (u) => u.phase === "complete",
      );
      expect(completeUpdate).toBeDefined();
      expect(completeUpdate.percentage).toBe(100);
      expect(completeUpdate.message).toContain("failed");
    });

    it("should handle compilation errors", async () => {
      mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
        const cmdStr = String(cmd);
        const cb = typeof options === "function" ? options : callback;

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          const error: any = new Error("Compilation failed");
          error.stdout = "";
          error.stderr = "** Error: design.sv(42): Syntax error\n";
          cb(error);
        }
        return {} as any;
      });

      const result = await service.runSimulation(baseConfig);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].file).toBe("design.sv");
      expect(result.errors[0].line).toBe(42);
      expect(result.errors[0].message).toContain("Syntax error");
    });
  });

  describe("Error Parsing", () => {
    describe("ModelSim Error Parsing", () => {
      it("should parse ModelSim error with file and line number", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "** Error: counter.v(15): Syntax error near 'always'\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("counter.v");
        expect(result.errors[0].line).toBe(15);
        expect(result.errors[0].message).toBe("Syntax error near 'always'");
        expect(result.errors[0].severity).toBe("error");
      });

      it("should parse ModelSim fatal error", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "** Fatal: memory.sv(100): Out of memory during compilation\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("memory.sv");
        expect(result.errors[0].line).toBe(100);
        expect(result.errors[0].message).toBe(
          "Out of memory during compilation",
        );
        expect(result.errors[0].severity).toBe("fatal");
      });

      it("should parse ModelSim warning", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            cb(null, {
              stdout:
                "** Warning: alu.sv(25): Signal 'unused_bit' is never used\n",
              stderr: "",
            });
          } else if (cmdStr.includes("vsim")) {
            cb(null, { stdout: "Simulation complete\n", stderr: "" });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("alu.sv");
        expect(result.warnings[0].line).toBe(25);
        expect(result.warnings[0].message).toBe(
          "Signal 'unused_bit' is never used",
        );
      });

      it("should parse multiple ModelSim errors", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "** Error: design.sv(10): Undefined variable 'clk'\n" +
              "** Error: design.sv(20): Missing semicolon\n" +
              "** Warning: design.sv(30): Implicit wire declaration\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(2);
        expect(result.errors[0].file).toBe("design.sv");
        expect(result.errors[0].line).toBe(10);
        expect(result.errors[0].message).toBe("Undefined variable 'clk'");

        expect(result.errors[1].file).toBe("design.sv");
        expect(result.errors[1].line).toBe(20);
        expect(result.errors[1].message).toBe("Missing semicolon");

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("design.sv");
        expect(result.warnings[0].line).toBe(30);
        expect(result.warnings[0].message).toBe("Implicit wire declaration");
      });
    });

    describe("VCS Error Parsing", () => {
      it("should parse VCS error with file and line number", async () => {
        const config: SimulationConfig = {
          simulator: "vcs",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vcs", stderr: "" });
          } else if (cmdStr.includes("vcs") && !cmdStr.includes("./simv")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "Error-[SE] fifo.v, line 42: Unexpected token 'endmodule'\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("fifo.v");
        expect(result.errors[0].line).toBe(42);
        expect(result.errors[0].message).toBe("Unexpected token 'endmodule'");
        expect(result.errors[0].severity).toBe("error");
      });

      it("should parse VCS warning", async () => {
        const config: SimulationConfig = {
          simulator: "vcs",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vcs", stderr: "" });
          } else if (cmdStr.includes("vcs") && !cmdStr.includes("./simv")) {
            cb(null, {
              stdout:
                "Warning-[LCA] controller.sv, line 55: Latch inferred for signal 'state'\n",
              stderr: "",
            });
          } else if (cmdStr.includes("./simv")) {
            cb(null, { stdout: "Simulation complete\n", stderr: "" });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("controller.sv");
        expect(result.warnings[0].line).toBe(55);
        expect(result.warnings[0].message).toBe(
          "Latch inferred for signal 'state'",
        );
      });
    });

    describe("Xcelium Error Parsing", () => {
      it("should parse Xcelium error with file and line number", async () => {
        const config: SimulationConfig = {
          simulator: "xcelium",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/xrun", stderr: "" });
          } else if (cmdStr.includes("xrun")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "xmvlog: *E,NOMOD (decoder.sv,33): Module 'mux' is not defined\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("decoder.sv");
        expect(result.errors[0].line).toBe(33);
        expect(result.errors[0].message).toBe("Module 'mux' is not defined");
        expect(result.errors[0].severity).toBe("error");
      });

      it("should parse Xcelium warning", async () => {
        const config: SimulationConfig = {
          simulator: "xcelium",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/xrun", stderr: "" });
          } else if (cmdStr.includes("xrun")) {
            cb(null, {
              stdout:
                "xmvlog: *W,WIDTHM (adder.sv,18): Width mismatch in assignment\n",
              stderr: "",
            });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("adder.sv");
        expect(result.warnings[0].line).toBe(18);
        expect(result.warnings[0].message).toBe("Width mismatch in assignment");
      });
    });

    describe("Verilator Error Parsing", () => {
      it("should parse Verilator error with file and line number", async () => {
        const config: SimulationConfig = {
          simulator: "verilator",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/verilator", stderr: "" });
          } else if (cmdStr.includes("verilator")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "%Error: register.v:27: syntax error, unexpected 'endmodule'\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("register.v");
        expect(result.errors[0].line).toBe(27);
        expect(result.errors[0].message).toBe(
          "syntax error, unexpected 'endmodule'",
        );
        expect(result.errors[0].severity).toBe("error");
      });

      it("should parse Verilator warning", async () => {
        const config: SimulationConfig = {
          simulator: "verilator",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/verilator", stderr: "" });
          } else if (cmdStr.includes("verilator")) {
            cb(null, {
              stdout:
                "%Warning-UNUSED: shifter.v:12: Signal is not used: 'debug_flag'\n",
              stderr: "",
            });
          } else if (cmdStr.includes("./obj_dir")) {
            cb(null, { stdout: "Simulation complete\n", stderr: "" });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("shifter.v");
        expect(result.warnings[0].line).toBe(12);
        expect(result.warnings[0].message).toBe(
          "Signal is not used: 'debug_flag'",
        );
      });
    });

    describe("Icarus Error Parsing", () => {
      it("should parse Icarus error with file and line number", async () => {
        const config: SimulationConfig = {
          simulator: "icarus",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/iverilog", stderr: "" });
          } else if (cmdStr.includes("iverilog")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr = "multiplier.v:45: error: syntax error\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("multiplier.v");
        expect(result.errors[0].line).toBe(45);
        expect(result.errors[0].message).toBe("syntax error");
        expect(result.errors[0].severity).toBe("error");
      });

      it("should parse Icarus warning", async () => {
        const config: SimulationConfig = {
          simulator: "icarus",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/iverilog", stderr: "" });
          } else if (cmdStr.includes("iverilog")) {
            cb(null, {
              stdout:
                "divider.v:60: warning: implicit definition of wire 'quotient'\n",
              stderr: "",
            });
          } else if (cmdStr.includes("vvp")) {
            cb(null, { stdout: "Simulation complete\n", stderr: "" });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.warnings).toHaveLength(1);
        expect(result.warnings[0].file).toBe("divider.v");
        expect(result.warnings[0].line).toBe(60);
        expect(result.warnings[0].message).toBe(
          "implicit definition of wire 'quotient'",
        );
      });
    });

    describe("Edge Cases", () => {
      it("should handle output with no errors or warnings", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockFsAccess.mockResolvedValue(undefined);

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            cb(null, {
              stdout: "Compilation successful\nNo errors found\n",
              stderr: "",
            });
          } else if (cmdStr.includes("vsim")) {
            cb(null, { stdout: "Simulation complete\n", stderr: "" });
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
        expect(result.success).toBe(true);
      });

      it("should handle malformed error lines gracefully", async () => {
        const config: SimulationConfig = {
          simulator: "modelsim",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vsim", stderr: "" });
          } else if (cmdStr.includes("vlog")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "** Error: This is a malformed error line\n" +
              "** Error: design.sv(10): Valid error\n" +
              "Some random output\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        // Should only parse the valid error
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("design.sv");
        expect(result.errors[0].line).toBe(10);
      });

      it("should extract file paths with directories", async () => {
        const config: SimulationConfig = {
          simulator: "vcs",
          projectId: "test-project",
          generationId: "test-gen",
          testbenchFiles: ["testbench.sv"],
          rtlFiles: ["design.sv"],
          topModule: "testbench",
          runtime: "1000ns",
          timescale: "1ns/1ps",
          plusargs: [],
          defines: {},
          vcdOutputPath: "/tmp/output.vcd",
        };

        mockExec.mockImplementation((cmd: any, options: any, callback: any) => {
          const cmdStr = String(cmd);
          const cb = typeof options === "function" ? options : callback;

          if (cmdStr.includes("which") || cmdStr.includes("where")) {
            cb(null, { stdout: "/usr/bin/vcs", stderr: "" });
          } else if (cmdStr.includes("vcs") && !cmdStr.includes("./simv")) {
            const error: any = new Error("Compilation failed");
            error.stdout = "";
            error.stderr =
              "Error-[SE] ./rtl/core/alu.sv, line 100: Undefined signal\n";
            cb(error);
          }
          return {} as any;
        });

        const result = await service.runSimulation(config);

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].file).toBe("./rtl/core/alu.sv");
        expect(result.errors[0].line).toBe(100);
        expect(result.errors[0].message).toBe("Undefined signal");
      });
    });

    it("should fail when simulator is not available", async () => {
      const config: SimulationConfig = {
        simulator: "modelsim",
        projectId: "test-project",
        generationId: "test-gen",
        testbenchFiles: ["testbench.sv"],
        rtlFiles: ["design.sv"],
        topModule: "testbench",
        runtime: "1000ns",
        timescale: "1ns/1ps",
        plusargs: [],
        defines: {},
        vcdOutputPath: "/tmp/output.vcd",
      };

      mockExec.mockImplementation((cmd: any, callback: any) => {
        callback(new Error("Command not found"), { stdout: "", stderr: "" });
        return {} as any;
      });

      const result = await service.runSimulation(config);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].severity).toBe("fatal");
    });

    it("should fail when VCD file is not generated", async () => {
      const config: SimulationConfig = {
        simulator: "modelsim",
        projectId: "test-project",
        generationId: "test-gen",
        testbenchFiles: ["testbench.sv"],
        rtlFiles: ["design.sv"],
        topModule: "testbench",
        runtime: "1000ns",
        timescale: "1ns/1ps",
        plusargs: [],
        defines: {},
        vcdOutputPath: "/tmp/output.vcd",
      };

      mockFsAccess.mockRejectedValue(new Error("File not found"));

      mockExec.mockImplementation((cmd: any, callback: any) => {
        const cmdStr = String(cmd);

        if (cmdStr.includes("which") || cmdStr.includes("where")) {
          callback(null, { stdout: "/usr/bin/vsim", stderr: "" });
        } else if (cmdStr.includes("vlog")) {
          callback(null, { stdout: "Compilation successful\n", stderr: "" });
        } else if (cmdStr.includes("vsim")) {
          callback(null, { stdout: "Simulation complete\n", stderr: "" });
        }
        return {} as any;
      });

      const result = await service.runSimulation(config);

      expect(result.success).toBe(false);
      expect(result.vcdFilePath).toBe("");
    });
  });

  describe("cancelSimulation", () => {
    it("should cancel a running simulation and clean up VCD file", async () => {
      const jobId = "test-job-123";
      const vcdPath = "/tmp/test.vcd";

      // Mock a running process
      const mockProcess = {
        pid: 12345,
        killed: false,
        kill: jest.fn(),
      };

      // Manually add a simulation to the tracking map
      (service as any).runningSimulations.set(jobId, {
        process: mockProcess,
        config: {
          vcdOutputPath: vcdPath,
        },
      });

      // Mock VCD file exists
      mockFsAccess.mockResolvedValue(undefined);

      // Mock fs.unlink
      const mockUnlink = jest.spyOn(fs, "unlink").mockResolvedValue(undefined);

      // Mock process.kill
      const originalKill = process.kill;
      process.kill = jest.fn();

      await service.cancelSimulation(jobId);

      // Verify process was killed
      expect(process.kill).toHaveBeenCalled();

      // Verify VCD file was deleted
      expect(mockUnlink).toHaveBeenCalledWith(vcdPath);

      // Verify simulation was removed from tracking
      expect(service.isSimulationRunning(jobId)).toBe(false);

      // Restore original process.kill
      process.kill = originalKill;
    });

    it("should handle canceling non-existent simulation gracefully", async () => {
      const jobId = "non-existent-job";

      // Should not throw
      await expect(service.cancelSimulation(jobId)).resolves.not.toThrow();
    });

    it("should handle VCD cleanup errors gracefully", async () => {
      const jobId = "test-job-456";
      const vcdPath = "/tmp/test2.vcd";

      // Mock a running process
      const mockProcess = {
        pid: 12346,
        killed: false,
        kill: jest.fn(),
      };

      (service as any).runningSimulations.set(jobId, {
        process: mockProcess,
        config: {
          vcdOutputPath: vcdPath,
        },
      });

      // Mock VCD file exists
      mockFsAccess.mockResolvedValue(undefined);

      // Mock fs.unlink to fail
      const mockUnlink = jest
        .spyOn(fs, "unlink")
        .mockRejectedValue(new Error("Permission denied"));

      // Mock process.kill
      const originalKill = process.kill;
      process.kill = jest.fn();

      // Should not throw even if VCD cleanup fails
      await expect(service.cancelSimulation(jobId)).resolves.not.toThrow();

      // Verify simulation was still removed from tracking
      expect(service.isSimulationRunning(jobId)).toBe(false);

      // Restore original process.kill
      process.kill = originalKill;
    });

    it("should not attempt to delete VCD file if it doesn't exist", async () => {
      const jobId = "test-job-789";
      const vcdPath = "/tmp/nonexistent.vcd";

      // Mock a running process
      const mockProcess = {
        pid: 12347,
        killed: false,
        kill: jest.fn(),
      };

      (service as any).runningSimulations.set(jobId, {
        process: mockProcess,
        config: {
          vcdOutputPath: vcdPath,
        },
      });

      // Mock VCD file doesn't exist
      mockFsAccess.mockRejectedValue(new Error("File not found"));

      // Mock fs.unlink
      const mockUnlink = jest.spyOn(fs, "unlink").mockResolvedValue(undefined);

      // Mock process.kill
      const originalKill = process.kill;
      process.kill = jest.fn();

      await service.cancelSimulation(jobId);

      // Verify VCD file deletion was not attempted
      expect(mockUnlink).not.toHaveBeenCalled();

      // Restore original process.kill
      process.kill = originalKill;
    });
  });

  describe("getRunningSimulations", () => {
    it("should return empty array when no simulations are running", () => {
      const running = service.getRunningSimulations();
      expect(running).toEqual([]);
    });

    it("should return list of running simulation job IDs", () => {
      // Add some mock simulations
      (service as any).runningSimulations.set("job1", {
        process: {},
        config: {},
      });
      (service as any).runningSimulations.set("job2", {
        process: {},
        config: {},
      });

      const running = service.getRunningSimulations();
      expect(running).toHaveLength(2);
      expect(running).toContain("job1");
      expect(running).toContain("job2");
    });
  });

  describe("isSimulationRunning", () => {
    it("should return false for non-existent job", () => {
      expect(service.isSimulationRunning("non-existent")).toBe(false);
    });

    it("should return true for running simulation", () => {
      const jobId = "running-job";
      (service as any).runningSimulations.set(jobId, {
        process: {},
        config: {},
      });

      expect(service.isSimulationRunning(jobId)).toBe(true);
    });
  });
});
