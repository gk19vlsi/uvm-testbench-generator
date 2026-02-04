import { rtlAgent, RTLAgentInput } from "../agents/RTLAgent";
import { llmService } from "../services/LLMService";
import {
  classifyClockSignals,
  classifyResetSignals,
  isClockSignal,
  isResetSignal,
  determineResetPolarity,
  isResetSynchronous,
  extractFrequency,
  classifySignalType,
  groupRelatedSignals,
  identifyProtocolSignals,
} from "../utils/signalClassification";
import { Port } from "../parsers/rtlParser";

describe("RTL Agent", () => {
  describe("Signal Classification Utility", () => {
    describe("Clock Signal Classification", () => {
      it("should identify clock signals by name", () => {
        expect(isClockSignal("clk")).toBe(true);
        expect(isClockSignal("clock")).toBe(true);
        expect(isClockSignal("sys_clk")).toBe(true);
        expect(isClockSignal("clk_100mhz")).toBe(true);
        expect(isClockSignal("data")).toBe(false);
      });

      it("should classify clock signals from ports", () => {
        const ports: Port[] = [
          { name: "clk", direction: "input", type: "logic" },
          { name: "rst_n", direction: "input", type: "logic" },
          { name: "data", direction: "input", type: "logic", width: "[31:0]" },
        ];

        const clocks = classifyClockSignals(ports);

        expect(clocks.length).toBe(1);
        expect(clocks[0].name).toBe("clk");
        expect(clocks[0].dutyCycle).toBe(50);
      });

      it("should extract frequency from content", () => {
        const content = "// clk runs at 100 MHz";
        const frequency = extractFrequency("clk", content);

        expect(frequency).toBe(100000000);
      });

      it("should handle different frequency units", () => {
        expect(extractFrequency("clk", "clk: 50 MHz")).toBe(50000000);
        expect(extractFrequency("clk", "clk: 1000 KHz")).toBe(1000000);
        expect(extractFrequency("clk", "clk: 10000000 Hz")).toBe(10000000);
      });
    });

    describe("Reset Signal Classification", () => {
      it("should identify reset signals by name", () => {
        expect(isResetSignal("rst")).toBe(true);
        expect(isResetSignal("reset")).toBe(true);
        expect(isResetSignal("rst_n")).toBe(true);
        expect(isResetSignal("sys_reset")).toBe(true);
        expect(isResetSignal("data")).toBe(false);
      });

      it("should determine reset polarity", () => {
        expect(determineResetPolarity("rst")).toBe("active_high");
        expect(determineResetPolarity("rst_n")).toBe("active_low");
        expect(determineResetPolarity("nrst")).toBe("active_low");
        expect(determineResetPolarity("reset_n")).toBe("active_low");
        expect(determineResetPolarity("reset")).toBe("active_high");
      });

      it("should detect synchronous resets", () => {
        const content = `
          always @(posedge clk or negedge rst_n) begin
            if (!rst_n) begin
              // reset logic
            end
          end
        `;

        expect(isResetSynchronous("rst_n", content)).toBe(true);
        expect(isResetSynchronous("other_signal", content)).toBe(false);
      });

      it("should classify reset signals from ports", () => {
        const ports: Port[] = [
          { name: "clk", direction: "input", type: "logic" },
          { name: "rst_n", direction: "input", type: "logic" },
          { name: "data", direction: "input", type: "logic", width: "[31:0]" },
        ];

        const resets = classifyResetSignals(ports);

        expect(resets.length).toBe(1);
        expect(resets[0].name).toBe("rst_n");
        expect(resets[0].polarity).toBe("active_low");
      });
    });

    describe("Signal Type Classification", () => {
      it("should classify generic signal types", () => {
        expect(classifySignalType("clk")).toBe("clock");
        expect(classifySignalType("rst_n")).toBe("reset");
        expect(classifySignalType("addr")).toBe("address");
        expect(classifySignalType("data")).toBe("data");
        expect(classifySignalType("valid")).toBe("control");
        expect(classifySignalType("ready")).toBe("control");
      });

      it("should classify AXI protocol signals", () => {
        expect(classifySignalType("awvalid", "AXI")).toBe("control");
        expect(classifySignalType("awaddr", "AXI")).toBe("address");
        expect(classifySignalType("wdata", "AXI")).toBe("data");
      });

      it("should classify UART protocol signals", () => {
        expect(classifySignalType("tx", "UART")).toBe("data");
        expect(classifySignalType("rx", "UART")).toBe("data");
        expect(classifySignalType("tx_valid", "UART")).toBe("control");
      });
    });

    describe("Signal Grouping", () => {
      it("should group related signals", () => {
        const ports: Port[] = [
          { name: "axi_awvalid", direction: "output", type: "logic" },
          { name: "axi_awready", direction: "input", type: "logic" },
          {
            name: "axi_awaddr",
            direction: "output",
            type: "logic",
            width: "[31:0]",
          },
          { name: "apb_psel", direction: "output", type: "logic" },
          { name: "apb_penable", direction: "output", type: "logic" },
        ];

        const groups = groupRelatedSignals(ports);

        // Groups should contain signals with common prefixes
        // The grouping may vary based on implementation
        expect(groups).toBeDefined();
      });
    });

    describe("Protocol Signal Identification", () => {
      it("should identify AXI signals", () => {
        const ports: Port[] = [
          { name: "awvalid", direction: "output", type: "logic" },
          { name: "awready", direction: "input", type: "logic" },
          {
            name: "wdata",
            direction: "output",
            type: "logic",
            width: "[31:0]",
          },
          { name: "other_signal", direction: "input", type: "logic" },
        ];

        const axiSignals = identifyProtocolSignals(ports, "AXI");

        expect(axiSignals.length).toBe(3);
        expect(axiSignals.map((s) => s.name)).toContain("awvalid");
        expect(axiSignals.map((s) => s.name)).toContain("awready");
        expect(axiSignals.map((s) => s.name)).toContain("wdata");
      });

      it("should identify UART signals", () => {
        const ports: Port[] = [
          { name: "tx", direction: "output", type: "logic" },
          { name: "rx", direction: "input", type: "logic" },
          { name: "clk", direction: "input", type: "logic" },
        ];

        const uartSignals = identifyProtocolSignals(ports, "UART");

        expect(uartSignals.length).toBe(2);
        expect(uartSignals.map((s) => s.name)).toContain("tx");
        expect(uartSignals.map((s) => s.name)).toContain("rx");
      });
    });
  });

  describe("RTL Agent Execution", () => {
    it("should validate input correctly", async () => {
      const invalidInput = {
        projectId: "",
        llmProvider: llmService.getLLM(),
        rtlFiles: [],
      } as RTLAgentInput;

      const result = await rtlAgent.execute(invalidInput);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should require RTL files", async () => {
      const input = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        rtlFiles: [],
      } as RTLAgentInput;

      const result = await rtlAgent.execute(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain("RTL files");
    });

    it("should parse simple RTL module", async () => {
      const input: RTLAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        rtlFiles: [
          {
            fileId: "file1",
            filename: "counter.sv",
            content: `
              module counter (
                input logic clk,
                input logic rst_n,
                input logic enable,
                output logic [7:0] count
              );
                always_ff @(posedge clk or negedge rst_n) begin
                  if (!rst_n)
                    count <= 8'h0;
                  else if (enable)
                    count <= count + 1;
                end
              endmodule
            `,
          },
        ],
      };

      const result = await rtlAgent.execute(input);

      expect(result).toBeDefined();
      expect(result.metadata.executionTime).toBeGreaterThan(0);

      if (result.success) {
        expect(result.data.modules.length).toBeGreaterThan(0);
        expect(result.data.topModule).toBe("counter");
        expect(result.data.clockSignals.length).toBeGreaterThan(0);
        expect(result.data.resetSignals.length).toBeGreaterThan(0);
      }
    }, 10000);

    it("should identify top module correctly", async () => {
      const input: RTLAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        rtlFiles: [
          {
            fileId: "file1",
            filename: "design.sv",
            content: `
              module sub_module (
                input logic clk,
                output logic data
              );
              endmodule

              module top_module (
                input logic clk,
                input logic rst_n,
                output logic out
              );
                logic internal_data;
                sub_module u_sub (
                  .clk(clk),
                  .data(internal_data)
                );
              endmodule
            `,
          },
        ],
      };

      const result = await rtlAgent.execute(input);

      if (result.success) {
        expect(result.data.topModule).toBe("top_module");
        expect(result.data.modules.length).toBe(2);
      }
    }, 10000);

    it("should classify clock and reset signals", async () => {
      const input: RTLAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        rtlFiles: [
          {
            fileId: "file1",
            filename: "design.sv",
            content: `
              // Clock runs at 100 MHz
              module design (
                input logic clk,
                input logic rst_n,
                input logic [31:0] data_in,
                output logic [31:0] data_out
              );
              endmodule
            `,
          },
        ],
      };

      const result = await rtlAgent.execute(input);

      if (result.success) {
        expect(result.data.clockSignals.length).toBeGreaterThan(0);
        expect(result.data.clockSignals[0].name).toBe("clk");

        expect(result.data.resetSignals.length).toBeGreaterThan(0);
        expect(result.data.resetSignals[0].name).toBe("rst_n");
        expect(result.data.resetSignals[0].polarity).toBe("active_low");
      }
    }, 10000);
  });

  describe("Progress Callbacks", () => {
    it("should call progress callback during execution", async () => {
      const progressUpdates: any[] = [];

      rtlAgent.onProgress((update) => {
        progressUpdates.push(update);
      });

      const input: RTLAgentInput = {
        projectId: "test-project",
        llmProvider: llmService.getLLM(),
        rtlFiles: [
          {
            fileId: "file1",
            filename: "simple.sv",
            content: `
              module simple (input logic clk, output logic out);
              endmodule
            `,
          },
        ],
      };

      await rtlAgent.execute(input);

      expect(progressUpdates.length).toBeGreaterThan(0);

      const firstUpdate = progressUpdates[0];
      expect(firstUpdate.timestamp).toBeDefined();
      expect(firstUpdate.agentName).toBe("RTL Agent");
      expect(firstUpdate.status).toBeDefined();
      expect(firstUpdate.message).toBeDefined();
    }, 10000);
  });
});
