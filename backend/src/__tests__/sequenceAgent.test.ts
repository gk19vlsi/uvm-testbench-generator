import { SequenceAgent } from "../agents/SequenceAgent";
import { SpecificationAgentData } from "../agents/SpecificationAgent";
import { ArchitectureAgentData } from "../agents/ArchitectureAgent";
import { GeneratorAgentData } from "../agents/GeneratorAgent";

describe("SequenceAgent", () => {
  let agent: SequenceAgent;
  let mockLLM: any;

  beforeEach(() => {
    agent = new SequenceAgent();

    // Mock LLM
    mockLLM = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({}),
      }),
    };
  });

  describe("execute", () => {
    it("should successfully generate sequences and tests", async () => {
      const specificationData: SpecificationAgentData = {
        protocols: [
          {
            name: "AXI",
            confidence: 0.95,
            signals: ["awvalid", "awready", "awaddr"],
            characteristics: {},
          },
        ],
        transactions: [
          {
            name: "WriteTransaction",
            fields: [
              {
                name: "addr",
                type: "bit",
                width: 32,
                constraints: ["addr inside {[0:1023]}"],
              },
              {
                name: "data",
                type: "bit",
                width: 32,
                constraints: [],
              },
            ],
            constraints: ["addr % 4 == 0"],
          },
        ],
        timingConstraints: {
          clockDomains: [{ name: "clk", frequency: 100 }],
          resetConditions: [{ name: "rst_n", polarity: "active_low" }],
          timingRequirements: [],
        },
        coverageGoals: {
          functionalCoverage: ["address_range", "data_values"],
          crossCoverage: ["addr_x_data"],
        },
        errorScenarios: [
          {
            name: "InvalidAddress",
            condition: "addr not aligned to 4 bytes",
            expectedResponse: "Error response",
          },
        ],
        verificationIntent: "Verify AXI write transactions",
      };

      const architectureData: ArchitectureAgentData = {
        environmentHierarchy: {
          topEnv: "axi_slave_env",
          agents: ["axi_master_agent"],
          scoreboard: "axi_slave_scoreboard",
          coverage: ["axi_master_coverage"],
        },
        agents: [
          {
            name: "axi_master_agent",
            type: "active",
            components: {
              driver: "axi_master_driver",
              monitor: "axi_master_monitor",
              sequencer: "axi_master_sequencer",
              agent: "axi_master_agent",
            },
          },
        ],
        virtualInterfaces: [
          {
            name: "axi_master_if",
            signals: ["awvalid", "awready", "awaddr"],
            clockingBlocks: [
              {
                name: "driver_cb",
                clock: "clk",
                direction: "driver",
                skew: "#1",
              },
              {
                name: "monitor_cb",
                clock: "clk",
                direction: "monitor",
                skew: "#0",
              },
            ],
          },
        ],
        scoreboardDesign: {
          strategy: "reference_model",
          inputPorts: ["axi_master_monitor_ap"],
          outputPorts: [],
          comparisonLogic: "Compare with reference model",
        },
        coverageDesign: {
          covergroups: [
            {
              name: "axi_transaction_cg",
              location: "axi_master_monitor",
              samplingEvent: "transaction_complete",
              coverpoints: ["awaddr", "wdata"],
            },
          ],
        },
      };

      const generatorData: GeneratorAgentData = {
        generatedFiles: [],
        fileStructure: {
          directories: [],
          files: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        architectureData,
        specificationData,
        generatorData,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.sequences).toBeDefined();
      expect(result.data.tests).toBeDefined();

      // Verify sequences were generated
      expect(result.data.sequences.length).toBeGreaterThan(0);

      // Verify base sequence was generated
      const baseSeq = result.data.sequences.find((s: any) => s.type === "base");
      expect(baseSeq).toBeDefined();
      expect(baseSeq.name).toBe("axi_master_base_seq");

      // Verify directed sequences were generated
      const directedSeqs = result.data.sequences.filter(
        (s: any) => s.type === "directed",
      );
      expect(directedSeqs.length).toBeGreaterThan(0);

      // Verify error sequences were generated
      const errorSeqs = result.data.sequences.filter(
        (s: any) => s.type === "error",
      );
      expect(errorSeqs.length).toBeGreaterThan(0);

      // Verify random sequence was generated
      const randomSeq = result.data.sequences.find(
        (s: any) => s.type === "random",
      );
      expect(randomSeq).toBeDefined();

      // Verify stress sequence was generated
      const stressSeq = result.data.sequences.find(
        (s: any) => s.type === "stress",
      );
      expect(stressSeq).toBeDefined();

      // Verify tests were generated
      expect(result.data.tests.length).toBeGreaterThan(0);

      // Verify smoke test was generated
      const smokeTest = result.data.tests.find((t: any) => t.type === "smoke");
      expect(smokeTest).toBeDefined();
      expect(smokeTest.name).toBe("axi_slave_smoke_test");

      // Verify random test was generated
      const randomTest = result.data.tests.find(
        (t: any) => t.type === "random",
      );
      expect(randomTest).toBeDefined();

      // Verify directed tests were generated
      const directedTests = result.data.tests.filter(
        (t: any) => t.type === "directed",
      );
      expect(directedTests.length).toBeGreaterThan(0);

      // Verify stress test was generated
      const stressTest = result.data.tests.find(
        (t: any) => t.type === "stress",
      );
      expect(stressTest).toBeDefined();
    });

    it("should handle missing architecture data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        architectureData: null as any,
        specificationData: {} as any,
        generatorData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Architecture data is required");
    });

    it("should handle missing specification data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        architectureData: {} as any,
        specificationData: null as any,
        generatorData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Specification data is required");
    });

    it("should handle missing generator data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        architectureData: {} as any,
        specificationData: {} as any,
        generatorData: null as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Generator data is required");
    });

    it("should handle no active agents", async () => {
      const architectureData: ArchitectureAgentData = {
        environmentHierarchy: {
          topEnv: "test_env",
          agents: ["passive_agent"],
          scoreboard: "test_scoreboard",
          coverage: [],
        },
        agents: [
          {
            name: "passive_agent",
            type: "passive",
            components: {
              monitor: "passive_monitor",
              agent: "passive_agent",
            },
          },
        ],
        virtualInterfaces: [],
        scoreboardDesign: {
          strategy: "transaction_comparison",
          inputPorts: [],
          outputPorts: [],
          comparisonLogic: "",
        },
        coverageDesign: {
          covergroups: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        architectureData,
        specificationData: {
          protocols: [],
          transactions: [],
          timingConstraints: {
            clockDomains: [],
            resetConditions: [],
            timingRequirements: [],
          },
          coverageGoals: {
            functionalCoverage: [],
            crossCoverage: [],
          },
          errorScenarios: [],
          verificationIntent: "",
        },
        generatorData: {
          generatedFiles: [],
          fileStructure: {
            directories: [],
            files: [],
          },
        },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No active agents found");
    });
  });
});
