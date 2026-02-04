import { ArchitectureAgent } from "../agents/ArchitectureAgent";
import { SpecificationAgentData } from "../agents/SpecificationAgent";
import { RTLAgentData } from "../agents/RTLAgent";
import { AlignmentAgentData } from "../agents/AlignmentAgent";

describe("ArchitectureAgent", () => {
  let agent: ArchitectureAgent;
  let mockLLM: any;

  beforeEach(() => {
    agent = new ArchitectureAgent();

    // Mock LLM
    mockLLM = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({
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
              signals: ["awvalid", "awready"],
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
        }),
      }),
    };
  });

  describe("execute", () => {
    it("should successfully plan testbench architecture", async () => {
      const alignmentData: AlignmentAgentData = {
        agentMappings: [
          {
            agentName: "axi_master_agent",
            agentType: "active",
            protocol: "AXI",
            signals: ["awvalid", "awready", "awaddr", "wdata"],
            transactions: ["WriteTransaction"],
          },
        ],
        signalAssignments: [
          {
            signal: "awvalid",
            role: "driver",
            agentName: "axi_master_agent",
          },
          {
            signal: "awready",
            role: "monitor",
            agentName: "axi_master_agent",
          },
        ],
        coverageSignals: ["awaddr", "wdata"],
        scoreboardPairs: [],
      };

      const specificationData: SpecificationAgentData = {
        protocols: [
          {
            name: "AXI",
            confidence: 0.95,
            signals: ["awvalid", "awready"],
            characteristics: {},
          },
        ],
        transactions: [
          {
            name: "WriteTransaction",
            fields: [],
            constraints: [],
          },
        ],
        timingConstraints: {
          clockDomains: [{ name: "clk", frequency: 100000000 }],
          resetConditions: [],
          timingRequirements: [],
        },
        coverageGoals: {
          functionalCoverage: ["Cover all addresses"],
          crossCoverage: [],
        },
        errorScenarios: [],
        verificationIntent: "Verify AXI",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "axi_slave",
        ports: [
          { name: "clk", direction: "input", type: "logic", width: "1" },
          { name: "awvalid", direction: "input", type: "logic", width: "1" },
          { name: "awready", direction: "output", type: "logic", width: "1" },
        ],
        interfaces: [],
        clockSignals: [{ name: "clk", frequency: 100000000 }],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "axi_slave", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData,
        specificationData,
        rtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.environmentHierarchy).toBeDefined();
      expect(result.data.agents).toBeDefined();
      expect(result.data.agents.length).toBeGreaterThan(0);
      expect(result.data.virtualInterfaces).toBeDefined();
      expect(result.data.scoreboardDesign).toBeDefined();
      expect(result.data.coverageDesign).toBeDefined();
    });

    it("should create active agent with driver and sequencer", async () => {
      const alignmentData: AlignmentAgentData = {
        agentMappings: [
          {
            agentName: "uart_tx_agent",
            agentType: "active",
            signals: ["tx_data", "tx_valid"],
            transactions: [],
          },
        ],
        signalAssignments: [],
        coverageSignals: [],
        scoreboardPairs: [],
      };

      const specificationData: SpecificationAgentData = {
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
        verificationIntent: "Test",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "uart",
        ports: [],
        interfaces: [],
        clockSignals: [{ name: "clk" }],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "uart", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData,
        specificationData,
        rtlData,
      });

      expect(result.success).toBe(true);
      const uartAgent = result.data.agents.find(
        (a: any) => a.name === "uart_tx_agent",
      );
      expect(uartAgent).toBeDefined();
      expect(uartAgent.type).toBe("active");
      expect(uartAgent.components.driver).toBeDefined();
      expect(uartAgent.components.sequencer).toBeDefined();
      expect(uartAgent.components.monitor).toBeDefined();
    });

    it("should create passive agent without driver and sequencer", async () => {
      const alignmentData: AlignmentAgentData = {
        agentMappings: [
          {
            agentName: "uart_rx_agent",
            agentType: "passive",
            signals: ["rx_data", "rx_valid"],
            transactions: [],
          },
        ],
        signalAssignments: [],
        coverageSignals: [],
        scoreboardPairs: [],
      };

      const specificationData: SpecificationAgentData = {
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
        verificationIntent: "Test",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "uart",
        ports: [],
        interfaces: [],
        clockSignals: [{ name: "clk" }],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "uart", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData,
        specificationData,
        rtlData,
      });

      expect(result.success).toBe(true);
      const uartAgent = result.data.agents.find(
        (a: any) => a.name === "uart_rx_agent",
      );
      expect(uartAgent).toBeDefined();
      expect(uartAgent.type).toBe("passive");
      expect(uartAgent.components.driver).toBeUndefined();
      expect(uartAgent.components.sequencer).toBeUndefined();
      expect(uartAgent.components.monitor).toBeDefined();
    });

    it("should use reference model strategy for complex protocols", async () => {
      const alignmentData: AlignmentAgentData = {
        agentMappings: [
          {
            agentName: "axi_agent",
            agentType: "active",
            protocol: "AXI",
            signals: [],
            transactions: [],
          },
        ],
        signalAssignments: [],
        coverageSignals: [],
        scoreboardPairs: [],
      };

      const specificationData: SpecificationAgentData = {
        protocols: [
          {
            name: "AXI",
            confidence: 0.95,
            signals: [],
            characteristics: {},
          },
        ],
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
        verificationIntent: "Test",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "dut",
        ports: [],
        interfaces: [],
        clockSignals: [],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "dut", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData,
        specificationData,
        rtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data.scoreboardDesign.strategy).toBe("reference_model");
    });

    it("should create virtual interfaces with clocking blocks", async () => {
      const alignmentData: AlignmentAgentData = {
        agentMappings: [
          {
            agentName: "test_agent",
            agentType: "active",
            signals: ["sig1", "sig2"],
            transactions: [],
          },
        ],
        signalAssignments: [],
        coverageSignals: [],
        scoreboardPairs: [],
      };

      const specificationData: SpecificationAgentData = {
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
        verificationIntent: "Test",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "dut",
        ports: [],
        interfaces: [],
        clockSignals: [{ name: "clk", frequency: 100000000 }],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "dut", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData,
        specificationData,
        rtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data.virtualInterfaces.length).toBeGreaterThan(0);
      const vif = result.data.virtualInterfaces[0];
      expect(vif.clockingBlocks).toBeDefined();
      expect(vif.clockingBlocks.length).toBeGreaterThan(0);
    });

    it("should handle missing alignment data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        alignmentData: null as any,
        specificationData: {} as any,
        rtlData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Alignment data is required");
    });
  });
});
