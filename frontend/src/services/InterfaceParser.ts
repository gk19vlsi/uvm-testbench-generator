/**
 * SystemVerilog Interface Parser
 * Parses .sv interface files to extract signal definitions
 */

import { Signal } from "../types/simulation";

export interface ParsedSignal {
  name: string;
  bitWidth: number;
  type: "clock" | "data" | "control" | "reset";
  direction?: "input" | "output" | "inout";
}

export class InterfaceParser {
  /**
   * Parse SystemVerilog interface file content
   */
  static parseInterface(content: string): ParsedSignal[] {
    const signals: ParsedSignal[] = [];
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip comments and empty lines
      if (line.startsWith("//") || line.length === 0) {
        continue;
      }

      // Parse signal declarations: logic [width] signal_name;
      const signalMatch = line.match(
        /^\s*logic\s*(?:\[(\d+):(\d+)\])?\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/,
      );

      if (signalMatch) {
        const [, highBit, lowBit, signalName] = signalMatch;

        let bitWidth = 1;
        if (highBit && lowBit) {
          bitWidth = parseInt(highBit) - parseInt(lowBit) + 1;
        }

        // Determine signal type based on name
        const type = this.inferSignalType(signalName);

        signals.push({
          name: signalName,
          bitWidth,
          type,
        });
      }

      // Parse interface parameters: input logic clk
      const paramMatch = line.match(
        /^\s*(input|output|inout)\s+logic\s*(?:\[(\d+):(\d+)\])?\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
      );

      if (paramMatch) {
        const [, direction, highBit, lowBit, signalName] = paramMatch;

        let bitWidth = 1;
        if (highBit && lowBit) {
          bitWidth = parseInt(highBit) - parseInt(lowBit) + 1;
        }

        const type = this.inferSignalType(signalName);

        signals.push({
          name: signalName,
          bitWidth,
          type,
          direction: direction as "input" | "output" | "inout",
        });
      }
    }

    return signals;
  }

  /**
   * Infer signal type from signal name
   */
  private static inferSignalType(
    name: string,
  ): "clock" | "data" | "control" | "reset" {
    const lowerName = name.toLowerCase();

    if (lowerName.includes("clk") || lowerName.includes("clock")) {
      return "clock";
    }

    if (lowerName.includes("rst") || lowerName.includes("reset")) {
      return "reset";
    }

    if (
      lowerName.includes("valid") ||
      lowerName.includes("ready") ||
      lowerName.includes("enable") ||
      lowerName.includes("en") ||
      lowerName.includes("ack") ||
      lowerName.includes("req")
    ) {
      return "control";
    }

    return "data";
  }

  /**
   * Convert parsed signals to Signal type for visualization
   */
  static toVisualizationSignals(parsedSignals: ParsedSignal[]): Signal[] {
    const colorMap: Record<string, string> = {
      clock: "#22c55e", // green
      data: "#3b82f6", // blue
      control: "#f59e0b", // amber
      reset: "#ef4444", // red
    };

    return parsedSignals.map((signal, index) => ({
      id: signal.name,
      name: signal.name,
      type: signal.type,
      color: colorMap[signal.type] || "#6b7280",
      bitWidth: signal.bitWidth,
    }));
  }

  /**
   * Generate sample signal data for visualization
   * This creates realistic-looking transitions based on signal type
   */
  static generateSampleSignalData(
    signals: ParsedSignal[],
    duration: number = 100,
  ): any[] {
    return signals.map((signal) => {
      const transitions: Array<{ time: number; value: number }> = [];

      if (signal.type === "clock") {
        // Generate clock transitions
        const period = 10;
        for (let t = 0; t < duration; t += period / 2) {
          transitions.push({
            time: t,
            value: (t / (period / 2)) % 2,
          });
        }
      } else if (signal.type === "reset") {
        // Reset signal: starts low, goes high, stays high
        transitions.push({ time: 0, value: 0 });
        transitions.push({ time: 15, value: 1 });
      } else if (signal.type === "control") {
        // Control signals: toggle occasionally
        transitions.push({ time: 0, value: 0 });
        for (let t = 10; t < duration; t += 20) {
          transitions.push({ time: t, value: 1 });
          transitions.push({ time: t + 10, value: 0 });
        }
      } else {
        // Data signals: random values
        const maxValue = Math.pow(2, signal.bitWidth) - 1;
        transitions.push({ time: 0, value: 0 });

        for (let t = 10; t < duration; t += 10) {
          const value = Math.floor(Math.random() * maxValue);
          transitions.push({ time: t, value });
        }
      }

      return {
        signalId: signal.name,
        transitions,
      };
    });
  }
}

export default InterfaceParser;
