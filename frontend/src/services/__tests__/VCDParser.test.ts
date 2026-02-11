/**
 * Unit tests for VCDParser
 */

import { VCDParser } from "../VCDParser";
import { VCDData } from "../../types/vcd";

describe("VCDParser", () => {
  let parser: VCDParser;

  beforeEach(() => {
    parser = new VCDParser();
  });

  describe("parse - valid VCD files", () => {
    it("should parse a simple VCD file with header", () => {
      const vcdContent = `$date
   Mon Feb 5 12:00:00 2026
$end
$version
   ModelSim Version 10.5
$end
$timescale
   1ns
$end
$comment
   Test VCD file
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
#10
1!
#20
0!
`;

      const result = parser.parse(vcdContent);

      expect(result.header.date).toBe("Mon Feb 5 12:00:00 2026");
      expect(result.header.version).toBe("ModelSim Version 10.5");
      expect(result.header.timescale.value).toBe(1);
      expect(result.header.timescale.unit).toBe("ns");
      expect(result.header.comment).toBe("Test VCD file");
    });

    it("should parse signal definitions with scope", () => {
      const vcdContent = `$date
   Mon Feb 5 12:00:00 2026
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$var wire 8 " data_in [7:0] $end
$var wire 8 # data_out [7:0] $end
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.parse(vcdContent);

      expect(result.signals.size).toBe(3);
      expect(result.signals.get("!")?.name).toBe("clk");
      expect(result.signals.get("!")?.bitWidth).toBe(1);
      expect(result.signals.get("!")?.scope).toEqual(["testbench"]);
      expect(result.signals.get('"')?.name).toBe("data_in");
      expect(result.signals.get('"')?.bitWidth).toBe(8);
    });

    it("should parse scalar value changes", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
#10
1!
#20
0!
#30
1!
`;

      const result = parser.parse(vcdContent);

      const clkChanges = result.valueChanges.get("!");
      expect(clkChanges).toBeDefined();
      expect(clkChanges?.length).toBe(4);
      expect(clkChanges?.[0]).toEqual({ time: 0, value: "0" });
      expect(clkChanges?.[1]).toEqual({ time: 10, value: "1" });
      expect(clkChanges?.[2]).toEqual({ time: 20, value: "0" });
      expect(clkChanges?.[3]).toEqual({ time: 30, value: "1" });
    });

    it("should parse vector value changes", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 8 " data [7:0] $end
$upscope $end
$enddefinitions $end
#0
b00000000 "
#10
b11110000 "
#20
b10101010 "
`;

      const result = parser.parse(vcdContent);

      const dataChanges = result.valueChanges.get('"');
      expect(dataChanges).toBeDefined();
      expect(dataChanges?.length).toBe(3);
      expect(dataChanges?.[0]).toEqual({ time: 0, value: "00000000" });
      expect(dataChanges?.[1]).toEqual({ time: 10, value: "11110000" });
      expect(dataChanges?.[2]).toEqual({ time: 20, value: "10101010" });
    });

    it("should handle X and Z states", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! sig $end
$var wire 8 " data [7:0] $end
$upscope $end
$enddefinitions $end
#0
X!
b0000xxxx "
#10
Z!
b0000zzzz "
`;

      const result = parser.parse(vcdContent);

      const sigChanges = result.valueChanges.get("!");
      expect(sigChanges?.[0]).toEqual({ time: 0, value: "X" });
      expect(sigChanges?.[1]).toEqual({ time: 10, value: "Z" });

      const dataChanges = result.valueChanges.get('"');
      expect(dataChanges?.[0]).toEqual({ time: 0, value: "0000xxxx" });
      expect(dataChanges?.[1]).toEqual({ time: 10, value: "0000zzzz" });
    });

    it("should calculate correct time range", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
#100
1!
#500
0!
`;

      const result = parser.parse(vcdContent);

      expect(result.timeRange.start).toBe(0);
      expect(result.timeRange.end).toBe(500);
    });
  });

  describe("parse - edge cases", () => {
    it("should handle empty signals", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$enddefinitions $end
#0
`;

      const result = parser.parse(vcdContent);

      expect(result.signals.size).toBe(0);
      expect(result.valueChanges.size).toBe(0);
    });

    it("should handle single time point", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
`;

      const result = parser.parse(vcdContent);

      expect(result.timeRange.start).toBe(0);
      expect(result.timeRange.end).toBe(0);
    });

    it("should handle hierarchical scopes", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module top $end
$scope module sub1 $end
$var wire 1 ! sig1 $end
$upscope $end
$scope module sub2 $end
$var wire 1 " sig2 $end
$upscope $end
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.parse(vcdContent);

      expect(result.signals.get("!")?.scope).toEqual(["top", "sub1"]);
      expect(result.signals.get('"')?.scope).toEqual(["top", "sub2"]);
    });
  });

  describe("validate", () => {
    it("should validate a correct VCD file", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
`;

      const result = parser.validate(vcdContent);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report errors for empty VCD file", () => {
      const vcdContent = "";

      const result = parser.validate(vcdContent);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain("empty");
      expect(result.errors[0].suggestion).toBeDefined();
    });

    it("should report errors for missing $enddefinitions", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
#0
0!
`;

      const result = parser.validate(vcdContent);

      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("enddefinitions")),
      ).toBe(true);
    });

    it("should report errors for invalid $var declarations", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire invalid_format
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.validate(vcdContent);

      expect(result.errors.length).toBeGreaterThan(0);
      const varError = result.errors.find((e) => e.message.includes("$var"));
      expect(varError).toBeDefined();
      expect(varError?.line).toBeGreaterThan(0);
      expect(varError?.suggestion).toBeDefined();
    });

    it("should report errors for invalid timestamps", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#invalid
0!
`;

      const result = parser.validate(vcdContent);

      expect(result.errors.length).toBeGreaterThan(0);
      const timestampError = result.errors.find((e) =>
        e.message.includes("timestamp"),
      );
      expect(timestampError).toBeDefined();
      expect(timestampError?.suggestion).toBeDefined();
    });

    it("should report warnings for missing timescale", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
`;

      const result = parser.validate(vcdContent);

      expect(result.warnings.length).toBeGreaterThan(0);
      const timescaleWarning = result.warnings.find((w) =>
        w.message.includes("timescale"),
      );
      expect(timescaleWarning).toBeDefined();
      expect(timescaleWarning?.suggestion).toBeDefined();
    });

    it("should report warnings for unmatched scopes", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$enddefinitions $end
#0
0!
`;

      const result = parser.validate(vcdContent);

      expect(result.warnings.length).toBeGreaterThan(0);
      const scopeWarning = result.warnings.find((w) =>
        w.message.includes("scope"),
      );
      expect(scopeWarning).toBeDefined();
    });

    it("should report errors with line numbers", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire invalid
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.validate(vcdContent);

      expect(result.errors.length).toBeGreaterThan(0);
      result.errors.forEach((error) => {
        expect(error.line).toBeGreaterThan(0);
        expect(typeof error.message).toBe("string");
        expect(error.severity).toBe("error");
      });
    });

    it("should provide suggestions for common errors", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   invalid_format
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.validate(vcdContent);

      const timescaleError = result.errors.find((e) =>
        e.message.includes("timescale"),
      );
      if (timescaleError) {
        expect(timescaleError.suggestion).toBeDefined();
        expect(timescaleError.suggestion).toContain("format");
      }
    });
  });

  describe("convertToWaveform", () => {
    it("should convert VCD data to waveform format", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$var wire 8 " data [7:0] $end
$upscope $end
$enddefinitions $end
#0
0!
b00000000 "
#10
1!
b11110000 "
#20
0!
b10101010 "
`;

      const vcdData = parser.parse(vcdContent);
      const waveforms = parser.convertToWaveform(vcdData);

      expect(waveforms.size).toBe(2);
      expect(waveforms.has("clk")).toBe(true);
      expect(waveforms.has("data")).toBe(true);

      const clkWaveform = waveforms.get("clk");
      expect(clkWaveform?.signalId).toBe("clk");
      expect(clkWaveform?.transitions.length).toBe(3);
      expect(clkWaveform?.transitions[0]).toEqual({ time: 0, value: "0" });
      expect(clkWaveform?.transitions[1]).toEqual({ time: 10, value: "1" });
      expect(clkWaveform?.transitions[2]).toEqual({ time: 20, value: "0" });

      const dataWaveform = waveforms.get("data");
      expect(dataWaveform?.signalId).toBe("data");
      expect(dataWaveform?.transitions.length).toBe(3);
    });
  });

  describe("parseFile", () => {
    it("should parse a File object", async () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
#10
1!
`;

      // Mock File with text() method
      const mockFile = {
        size: vcdContent.length,
        slice: (start: number, end: number) => {
          const slicedContent = vcdContent.slice(start, end);
          return {
            text: async () => slicedContent,
          };
        },
      } as File;

      const result = await parser.parseFile(mockFile);

      expect(result.header.version).toBe("Test");
      expect(result.signals.size).toBe(1);
      expect(result.valueChanges.get("!")?.length).toBe(2);
    });

    it("should report progress during file parsing", async () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
`;

      const progressUpdates: number[] = [];
      parser.setProgressCallback((progress) => {
        progressUpdates.push(progress.percentage);
      });

      // Mock File with text() method
      const mockFile = {
        size: vcdContent.length,
        slice: (start: number, end: number) => {
          const slicedContent = vcdContent.slice(start, end);
          return {
            text: async () => slicedContent,
          };
        },
      } as File;

      await parser.parseFile(mockFile);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });
  });

  describe("parseStream", () => {
    it("should parse a ReadableStream", async () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1ns
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
0!
#10
1!
`;

      // Mock ReadableStream for Node.js environment
      const mockStream = {
        getReader: () => ({
          read: async () => {
            if (!mockStream._read) {
              mockStream._read = true;
              return { done: false, value: vcdContent };
            }
            return { done: true, value: undefined };
          },
          releaseLock: () => {},
        }),
        _read: false,
      } as unknown as ReadableStream<string>;

      const result = await parser.parseStream(mockStream);

      expect(result.header.version).toBe("Test");
      expect(result.signals.size).toBe(1);
      expect(result.valueChanges.get("!")?.length).toBe(2);
    });
  });

  describe("timescale parsing", () => {
    it("should parse timescale on same line", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale 1ns $end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.parse(vcdContent);

      expect(result.header.timescale.value).toBe(1);
      expect(result.header.timescale.unit).toBe("ns");
    });

    it("should parse timescale on next line", () => {
      const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   10ps
$end
$scope module testbench $end
$var wire 1 ! clk $end
$upscope $end
$enddefinitions $end
#0
`;

      const result = parser.parse(vcdContent);

      expect(result.header.timescale.value).toBe(10);
      expect(result.header.timescale.unit).toBe("ps");
    });

    it("should parse different timescale units", () => {
      const units = ["s", "ms", "us", "ns", "ps", "fs"];

      units.forEach((unit) => {
        const vcdContent = `$date
   Test
$end
$version
   Test
$end
$timescale
   1${unit}
$end
$enddefinitions $end
#0
`;

        const result = parser.parse(vcdContent);
        expect(result.header.timescale.unit).toBe(unit);
      });
    });
  });
});
