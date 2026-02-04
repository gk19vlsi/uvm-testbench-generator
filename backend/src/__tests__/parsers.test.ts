/**
 * Parser tests
 * Tests for specification and RTL parsers
 */

import { specificationParser } from "../parsers/specificationParser";
import { rtlParser } from "../parsers/rtlParser";
import fs from "fs/promises";
import path from "path";
import os from "os";

describe("Specification Parser", () => {
  let tempDir: string;

  beforeAll(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "spec-parser-test-"));
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("parseText", () => {
    it("should parse plain text file", async () => {
      const content = "This is a test specification.\nIt has multiple lines.";
      const filePath = path.join(tempDir, "spec.txt");
      await fs.writeFile(filePath, content);

      const result = await specificationParser.parseText(filePath);

      expect(result.success).toBe(true);
      expect(result.text).toBe(content);
      expect(result.metadata?.format).toBe("text");
      expect(result.metadata?.wordCount).toBeGreaterThan(0);
    });

    it("should handle empty text file", async () => {
      const filePath = path.join(tempDir, "empty.txt");
      await fs.writeFile(filePath, "");

      const result = await specificationParser.parseText(filePath);

      expect(result.success).toBe(true);
      expect(result.text).toBe("");
    });

    it("should handle non-existent file", async () => {
      const result = await specificationParser.parseText(
        "/non/existent/file.txt",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("parseMarkdown", () => {
    it("should parse markdown file", async () => {
      const content = `# Test Specification
      
## Overview
This is a **test** specification with *formatting*.

- Item 1
- Item 2
`;
      const filePath = path.join(tempDir, "spec.md");
      await fs.writeFile(filePath, content);

      const result = await specificationParser.parseMarkdown(filePath);

      expect(result.success).toBe(true);
      expect(result.text).toBeDefined();
      expect(result.text).toContain("Test Specification");
      expect(result.text).toContain("Overview");
      expect(result.metadata?.format).toBe("markdown");
    });

    it("should strip HTML tags from markdown", async () => {
      const content = "# Title\n\nSome text with **bold** and *italic*.";
      const filePath = path.join(tempDir, "formatted.md");
      await fs.writeFile(filePath, content);

      const result = await specificationParser.parseMarkdown(filePath);

      expect(result.success).toBe(true);
      expect(result.text).not.toContain("<");
      expect(result.text).not.toContain(">");
    });
  });

  describe("parse", () => {
    it("should auto-detect file type by extension", async () => {
      const txtFile = path.join(tempDir, "auto.txt");
      await fs.writeFile(txtFile, "Text content");

      const result = await specificationParser.parse(txtFile);

      expect(result.success).toBe(true);
      expect(result.metadata?.format).toBe("text");
    });

    it("should reject unsupported file format", async () => {
      const result = await specificationParser.parse("test.xyz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported");
    });
  });

  describe("parseMultiple", () => {
    it("should parse multiple files", async () => {
      const file1 = path.join(tempDir, "spec1.txt");
      const file2 = path.join(tempDir, "spec2.txt");

      await fs.writeFile(file1, "Specification 1");
      await fs.writeFile(file2, "Specification 2");

      const results = await specificationParser.parseMultiple([file1, file2]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe("combineResults", () => {
    it("should combine text from multiple results", () => {
      const results = [
        { success: true, text: "Part 1" },
        { success: true, text: "Part 2" },
        { success: false, error: "Failed" },
        { success: true, text: "Part 3" },
      ];

      const combined = specificationParser.combineResults(results);

      expect(combined).toContain("Part 1");
      expect(combined).toContain("Part 2");
      expect(combined).toContain("Part 3");
      expect(combined).not.toContain("Failed");
    });
  });
});

describe("RTL Parser", () => {
  describe("parseContent", () => {
    it("should parse simple module", () => {
      const content = `
module counter (
  input clk,
  input rst_n,
  output reg [7:0] count
);
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
      count <= 8'h0;
    else
      count <= count + 1;
  end
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(1);
      expect(result.modules![0].name).toBe("counter");
      expect(result.modules![0].ports).toHaveLength(3);
    });

    it("should extract ports correctly", () => {
      const content = `
module test (
  input wire clk,
  input wire [7:0] data_in,
  output reg [15:0] data_out,
  inout wire [3:0] bidir
);
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      const module = result.modules![0];

      expect(module.ports).toHaveLength(4);

      const clkPort = module.ports.find((p) => p.name === "clk");
      expect(clkPort?.direction).toBe("input");
      expect(clkPort?.type).toBe("wire");

      const dataInPort = module.ports.find((p) => p.name === "data_in");
      expect(dataInPort?.width).toBe("7:0");

      const dataOutPort = module.ports.find((p) => p.name === "data_out");
      expect(dataOutPort?.direction).toBe("output");
      expect(dataOutPort?.type).toBe("reg");

      const bidirPort = module.ports.find((p) => p.name === "bidir");
      expect(bidirPort?.direction).toBe("inout");
    });

    it("should extract parameters", () => {
      const content = `
module fifo #(
  parameter WIDTH = 8,
  parameter DEPTH = 16,
  parameter logic ASYNC = 1'b0
) (
  input clk
);
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      const module = result.modules![0];

      expect(module.parameters).toHaveLength(3);
      expect(module.parameters[0].name).toBe("WIDTH");
      expect(module.parameters[0].defaultValue).toBe("8");
      expect(module.parameters[2].type).toBe("logic");
    });

    it("should extract module instantiations", () => {
      const content = `
module top (
  input clk
);
  counter #(.WIDTH(8)) cnt_inst (
    .clk(clk),
    .count(count_val)
  );

  fifo fifo_inst (
    .clk(clk)
  );
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      const module = result.modules![0];

      expect(module.instantiations).toHaveLength(2);
      expect(module.instantiations[0].moduleName).toBe("counter");
      expect(module.instantiations[0].instanceName).toBe("cnt_inst");
      expect(module.instantiations[0].parameters).toHaveProperty("WIDTH", "8");

      expect(module.instantiations[1].moduleName).toBe("fifo");
      expect(module.instantiations[1].instanceName).toBe("fifo_inst");
    });

    it("should handle comments", () => {
      const content = `
// This is a comment
module test (
  input clk  // Clock signal
  /* Multi-line
     comment */
);
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(1);
    });

    it("should handle multiple modules", () => {
      const content = `
module mod1 (input a);
endmodule

module mod2 (input b);
endmodule
      `;

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(2);
      expect(result.modules![0].name).toBe("mod1");
      expect(result.modules![1].name).toBe("mod2");
    });

    it("should warn when no modules found", () => {
      const content = "// Just a comment, no modules";

      const result = rtlParser.parseContent(content);

      expect(result.success).toBe(true);
      expect(result.modules).toHaveLength(0);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain("No module");
    });
  });

  describe("classifySignals", () => {
    it("should identify clock signals", () => {
      const module = {
        name: "test",
        ports: [
          { name: "clk", direction: "input" as const, type: "wire" },
          { name: "clock_in", direction: "input" as const, type: "wire" },
          { name: "data", direction: "input" as const, type: "wire" },
        ],
        parameters: [],
        interfaces: [],
        instantiations: [],
      };

      const { clocks, resets } = rtlParser.classifySignals(module);

      expect(clocks).toContain("clk");
      expect(clocks).toContain("clock_in");
      expect(clocks).not.toContain("data");
    });

    it("should identify reset signals", () => {
      const module = {
        name: "test",
        ports: [
          { name: "rst_n", direction: "input" as const, type: "wire" },
          { name: "reset", direction: "input" as const, type: "wire" },
          { name: "arst", direction: "input" as const, type: "wire" },
          { name: "data", direction: "input" as const, type: "wire" },
        ],
        parameters: [],
        interfaces: [],
        instantiations: [],
      };

      const { clocks, resets } = rtlParser.classifySignals(module);

      expect(resets).toContain("rst_n");
      expect(resets).toContain("reset");
      expect(resets).toContain("arst");
      expect(resets).not.toContain("data");
    });
  });

  describe("buildHierarchy", () => {
    it("should build module hierarchy", () => {
      const results = [
        {
          success: true,
          modules: [
            {
              name: "top",
              ports: [],
              parameters: [],
              interfaces: [],
              instantiations: [
                { moduleName: "sub1", instanceName: "u1" },
                { moduleName: "sub2", instanceName: "u2" },
              ],
            },
            {
              name: "sub1",
              ports: [],
              parameters: [],
              interfaces: [],
              instantiations: [{ moduleName: "leaf", instanceName: "u3" }],
            },
            {
              name: "sub2",
              ports: [],
              parameters: [],
              interfaces: [],
              instantiations: [],
            },
            {
              name: "leaf",
              ports: [],
              parameters: [],
              interfaces: [],
              instantiations: [],
            },
          ],
        },
      ];

      const hierarchy = rtlParser.buildHierarchy(results);

      expect(hierarchy.get("top")).toEqual(["sub1", "sub2"]);
      expect(hierarchy.get("sub1")).toEqual(["leaf"]);
      expect(hierarchy.get("sub2")).toEqual([]);
      expect(hierarchy.get("leaf")).toEqual([]);
    });
  });
});
