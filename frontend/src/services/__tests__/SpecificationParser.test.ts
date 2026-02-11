/**
 * Unit tests for SpecificationParser
 */

import { SpecificationParser } from "../SpecificationParser";
import { TestbenchSpecification } from "../../types/simulation";

describe("SpecificationParser", () => {
  let parser: SpecificationParser;

  beforeEach(() => {
    parser = new SpecificationParser();
  });

  describe("validate", () => {
    it("should validate a complete specification", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "alu",
          ports: [
            { name: "clk", direction: "input", width: 1 },
            { name: "data_in", direction: "input", width: 32 },
          ],
        },
        verification: {
          testCases: [{ name: "test1", description: "Test 1" }],
          coverageGoals: [{ name: "functional", target: 100 }],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "ALU Agent",
          },
        ],
        signals: [
          {
            name: "data",
            type: "data",
            bitWidth: 32,
          },
        ],
        clocks: [
          {
            name: "clk",
            period: 10,
            dutyCycle: 0.5,
            phase: 0,
          },
        ],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing RTL description", () => {
      const spec = {
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent" as const,
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [],
      } as any;

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("RTL description is missing");
    });

    it("should detect missing verification plan", () => {
      const spec = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent" as const,
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [],
      } as any;

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Verification plan is missing");
    });

    it("should detect missing components", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [],
        signals: [],
        clocks: [],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("No UVM components defined");
    });

    it("should detect invalid clock period", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [
          {
            name: "clk",
            period: -10,
            dutyCycle: 0.5,
            phase: 0,
          },
        ],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid period"))).toBe(
        true,
      );
    });

    it("should detect invalid duty cycle", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [
          {
            name: "clk",
            period: 10,
            dutyCycle: 1.5,
            phase: 0,
          },
        ],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid duty cycle"))).toBe(
        true,
      );
    });

    it("should detect invalid signal bit width", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [
          {
            name: "data",
            type: "data",
            bitWidth: 0,
          },
        ],
        clocks: [],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid bit width"))).toBe(
        true,
      );
    });

    it("should generate warnings for missing optional fields", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [],
      };

      const result = parser.validate(spec);

      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("parse", () => {
    it("should parse a complete specification", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "alu",
          ports: [
            { name: "clk", direction: "input", width: 1 },
            { name: "data_in", direction: "input", width: 32 },
          ],
        },
        verification: {
          testCases: [{ name: "test1", description: "Test 1" }],
          coverageGoals: [{ name: "functional", target: 100 }],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "ALU Agent",
          },
        ],
        signals: [
          {
            name: "data",
            type: "data",
            bitWidth: 32,
          },
        ],
        clocks: [
          {
            name: "clk",
            period: 10,
            dutyCycle: 0.5,
            phase: 0,
          },
        ],
      };

      const vizData = parser.parse(spec);

      expect(vizData.components).toHaveLength(1);
      expect(vizData.signals).toHaveLength(1);
      expect(vizData.clocks).toHaveLength(1);
      expect(vizData.timeline).toBeDefined();
    });

    it("should parse components with correct properties", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "driver_1",
            type: "driver",
            name: "Test Driver",
            properties: { protocol: "AXI" },
          },
        ],
        signals: [],
        clocks: [],
      };

      const vizData = parser.parse(spec);

      expect(vizData.components[0].id).toBe("driver_1");
      expect(vizData.components[0].type).toBe("driver");
      expect(vizData.components[0].name).toBe("Test Driver");
      expect(vizData.components[0].properties.protocol).toBe("AXI");
    });

    it("should parse hierarchical components", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "Monitor",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      const vizData = parser.parse(spec);

      expect(vizData.components[0].children).toHaveLength(2);
      expect(vizData.components[0].children[0].type).toBe("driver");
      expect(vizData.components[0].children[1].type).toBe("monitor");
    });

    it("should parse signals with correct colors", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [
          {
            name: "clk",
            type: "clock",
            bitWidth: 1,
          },
          {
            name: "data",
            type: "data",
            bitWidth: 32,
          },
          {
            name: "valid",
            type: "control",
            bitWidth: 1,
          },
        ],
        clocks: [],
      };

      const vizData = parser.parse(spec);

      expect(vizData.signals).toHaveLength(3);
      expect(vizData.signals[0].color).toBe("#3B82F6"); // clock - blue
      expect(vizData.signals[1].color).toBe("#10B981"); // data - green
      expect(vizData.signals[2].color).toBe("#F59E0B"); // control - amber
    });

    it("should parse clocks with all properties", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [
          {
            name: "clk",
            period: 10,
            dutyCycle: 0.5,
            phase: 0,
          },
          {
            name: "clk2",
            period: 20,
            dutyCycle: 0.6,
            phase: 90,
          },
        ],
      };

      const vizData = parser.parse(spec);

      expect(vizData.clocks).toHaveLength(2);
      expect(vizData.clocks[0].period).toBe(10);
      expect(vizData.clocks[0].dutyCycle).toBe(0.5);
      expect(vizData.clocks[1].phase).toBe(90);
    });

    it("should create timeline config based on clocks", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [
          {
            name: "clk",
            period: 10,
            dutyCycle: 0.5,
            phase: 0,
          },
        ],
      };

      const vizData = parser.parse(spec);

      expect(vizData.timeline.duration).toBe(100); // 10 * 10
      expect(vizData.timeline.resolution).toBe(1); // 10 / 10
    });

    it("should throw error for invalid specification", () => {
      const spec = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [],
        signals: [],
        clocks: [],
      } as TestbenchSpecification;

      expect(() => parser.parse(spec)).toThrow("Invalid specification");
    });
  });
});
