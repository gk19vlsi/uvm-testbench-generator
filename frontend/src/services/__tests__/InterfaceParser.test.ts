/**
 * InterfaceParser Tests
 */

import { InterfaceParser } from "../InterfaceParser";

describe("InterfaceParser", () => {
  describe("parseInterface", () => {
    it("should parse simple logic signals", () => {
      const content = `
        interface test_if;
          logic clk;
          logic reset_n;
          logic valid;
        endinterface
      `;

      const signals = InterfaceParser.parseInterface(content);

      expect(signals).toHaveLength(3);
      expect(signals[0]).toEqual({
        name: "clk",
        bitWidth: 1,
        type: "clock",
      });
      expect(signals[1]).toEqual({
        name: "reset_n",
        bitWidth: 1,
        type: "reset",
      });
      expect(signals[2]).toEqual({
        name: "valid",
        bitWidth: 1,
        type: "control",
      });
    });

    it("should parse signals with bit widths", () => {
      const content = `
        interface test_if;
          logic [7:0] data_in;
          logic [15:0] address;
          logic [2:0] control;
        endinterface
      `;

      const signals = InterfaceParser.parseInterface(content);

      expect(signals).toHaveLength(3);
      expect(signals[0]).toEqual({
        name: "data_in",
        bitWidth: 8,
        type: "data",
      });
      expect(signals[1]).toEqual({
        name: "address",
        bitWidth: 16,
        type: "data",
      });
      expect(signals[2]).toEqual({
        name: "control",
        bitWidth: 3,
        type: "data",
      });
    });

    it("should parse interface parameters with direction", () => {
      const content = `
        interface test_if (
          input logic clk,
          input logic reset_n
        );
          logic [7:0] data;
        endinterface
      `;

      const signals = InterfaceParser.parseInterface(content);

      expect(signals).toHaveLength(3);
      expect(signals[0]).toEqual({
        name: "clk",
        bitWidth: 1,
        type: "clock",
        direction: "input",
      });
      expect(signals[1]).toEqual({
        name: "reset_n",
        bitWidth: 1,
        type: "reset",
        direction: "input",
      });
    });

    it("should skip comments and empty lines", () => {
      const content = `
        // This is a comment
        interface test_if;
          // Another comment
          logic clk;
          
          logic data;
        endinterface
      `;

      const signals = InterfaceParser.parseInterface(content);

      expect(signals).toHaveLength(2);
    });

    it("should handle real ALU interface", () => {
      const content = `
        interface alu_if (
          input logic clk
        );
          logic [2:0] a;
          logic [2:0] b;
          logic [1:0] op;
          logic [2:0] result;
          logic reset_n;
        endinterface
      `;

      const signals = InterfaceParser.parseInterface(content);

      expect(signals).toHaveLength(6);
      expect(signals.find((s) => s.name === "clk")).toEqual({
        name: "clk",
        bitWidth: 1,
        type: "clock",
        direction: "input",
      });
      expect(signals.find((s) => s.name === "a")).toEqual({
        name: "a",
        bitWidth: 3,
        type: "data",
      });
      expect(signals.find((s) => s.name === "reset_n")).toEqual({
        name: "reset_n",
        bitWidth: 1,
        type: "reset",
      });
    });
  });

  describe("toVisualizationSignals", () => {
    it("should convert parsed signals to visualization format", () => {
      const parsedSignals = [
        { name: "clk", bitWidth: 1, type: "clock" as const },
        { name: "data", bitWidth: 8, type: "data" as const },
        { name: "valid", bitWidth: 1, type: "control" as const },
      ];

      const vizSignals = InterfaceParser.toVisualizationSignals(parsedSignals);

      expect(vizSignals).toHaveLength(3);
      expect(vizSignals[0]).toEqual({
        id: "clk",
        name: "clk",
        type: "clock",
        color: "#22c55e",
        bitWidth: 1,
      });
      expect(vizSignals[1]).toEqual({
        id: "data",
        name: "data",
        type: "data",
        color: "#3b82f6",
        bitWidth: 8,
      });
    });
  });

  describe("generateSampleSignalData", () => {
    it("should generate clock transitions", () => {
      const signals = [{ name: "clk", bitWidth: 1, type: "clock" as const }];

      const signalData = InterfaceParser.generateSampleSignalData(signals, 50);

      expect(signalData).toHaveLength(1);
      expect(signalData[0].signalId).toBe("clk");
      expect(signalData[0].transitions.length).toBeGreaterThan(0);

      // Check clock alternates between 0 and 1
      const values = signalData[0].transitions.map((t: any) => t.value);
      expect(values).toContain(0);
      expect(values).toContain(1);
    });

    it("should generate reset signal pattern", () => {
      const signals = [
        { name: "reset_n", bitWidth: 1, type: "reset" as const },
      ];

      const signalData = InterfaceParser.generateSampleSignalData(signals, 50);

      expect(signalData).toHaveLength(1);
      expect(signalData[0].signalId).toBe("reset_n");

      // Reset should start at 0 and go to 1
      const transitions = signalData[0].transitions;
      expect(transitions[0].value).toBe(0);
      expect(transitions[transitions.length - 1].value).toBe(1);
    });

    it("should generate control signal toggles", () => {
      const signals = [
        { name: "valid", bitWidth: 1, type: "control" as const },
      ];

      const signalData = InterfaceParser.generateSampleSignalData(signals, 50);

      expect(signalData).toHaveLength(1);
      expect(signalData[0].transitions.length).toBeGreaterThan(2);
    });

    it("should generate data signal values within bit width", () => {
      const signals = [{ name: "data", bitWidth: 3, type: "data" as const }];

      const signalData = InterfaceParser.generateSampleSignalData(signals, 50);

      expect(signalData).toHaveLength(1);

      // All values should be within 0-7 (3 bits)
      const values = signalData[0].transitions.map((t: any) => t.value);
      values.forEach((value: number) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(7);
      });
    });
  });
});
