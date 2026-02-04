import { AlignmentAgent } from "../agents/AlignmentAgent";
import { SpecificationAgentData } from "../agents/SpecificationAgent";
import { RTLAgentData } from "../agents/RTLAgent";

describe("AlignmentAgent", () => {
  let agent: AlignmentAgent;
  let mockLLM: any;

  beforeEach(() => {
    agent = new AlignmentAgent();

    // Mock LLM
    mockLLM = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({
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
          scoreboardPairs: [
            {
              inputSignals: ["wdata"],
              outputSignals: ["rdata"],
              checkingStrategy: "transaction_comparison",
            },
          ],
        }),
      }),
    };
  });

  describe("execute", () => {
    it("should successfully align specification and RTL data", async () => {
      const specData: SpecificationAgentData = {
        protocols: [
          {
            name: "AXI",
            confidence: 0.95,
            signals: ["awvalid", "awready", "awaddr", "wdata"],
            characteristics: { busWidth: 32 },
          },
        ],
        transactions: [
          {
            name: "WriteTransaction",
            fields: [
              { name: "address", type: "bit", width: 32 },
              { name: "data", type: "bit", width: 32 },
            ],
            constraints: [],
          },
        ],
        timingConstraints: {
          clockDomains: [{ name: "clk", frequency: 100000000 }],
          resetConditions: [{ name: "rst_n", polarity: "active_low" }],
          timingRequirements: [],
        },
        coverageGoals: {
          functionalCoverage: ["Cover all addresses"],
          crossCoverage: [],
        },
        errorScenarios: [],
        verificationIntent: "Verify AXI write transactions",
      };

      const rtlData: RTLAgentData = {
        modules: [
          {
            name: "axi_slave",
            ports: [
              { name: "clk", direction: "input", type: "logic", width: "1" },
              { name: "rst_n", direction: "input", type: "logic", width: "1" },
              {
                name: "awvalid",
                direction: "input",
                type: "logic",
                width: "1",
              },
              {
                name: "awready",
                direction: "output",
                type: "logic",
                width: "1",
              },
              {
                name: "awaddr",
                direction: "input",
                type: "logic",
                width: "32",
              },
              { name: "wdata", direction: "input", type: "logic", width: "32" },
              {
                name: "rdata",
                direction: "output",
                type: "logic",
                width: "32",
              },
            ],
            parameters: [],
            instantiations: [],
            interfaces: [],
          },
        ],
        topModule: "axi_slave",
        ports: [
          { name: "clk", direction: "input", type: "logic", width: "1" },
          { name: "rst_n", direction: "input", type: "logic", width: "1" },
          { name: "awvalid", direction: "input", type: "logic", width: "1" },
          { name: "awready", direction: "output", type: "logic", width: "1" },
          { name: "awaddr", direction: "input", type: "logic", width: "32" },
          { name: "wdata", direction: "input", type: "logic", width: "32" },
          { name: "rdata", direction: "output", type: "logic", width: "32" },
        ],
        interfaces: [],
        clockSignals: [{ name: "clk", frequency: 100000000 }],
        resetSignals: [
          { name: "rst_n", polarity: "active_low", synchronous: true },
        ],
        parameters: [],
        hierarchy: {
          moduleName: "axi_slave",
          children: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        specificationData: specData,
        rtlData: rtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.agentMappings).toBeDefined();
      expect(result.data.agentMappings.length).toBeGreaterThan(0);
      expect(result.data.signalAssignments).toBeDefined();
      expect(result.data.coverageSignals).toBeDefined();
      expect(result.data.scoreboardPairs).toBeDefined();
    });

    it("should determine active agent type for inputs", async () => {
      const specData: SpecificationAgentData = {
        protocols: [
          {
            name: "UART",
            confidence: 0.9,
            signals: ["tx_data", "tx_valid"],
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
        verificationIntent: "Verify UART",
      };

      const rtlData: RTLAgentData = {
        modules: [],
        topModule: "uart",
        ports: [
          { name: "tx_data", direction: "input", type: "logic", width: "8" },
          { name: "tx_valid", direction: "input", type: "logic", width: "1" },
        ],
        interfaces: [],
        clockSignals: [],
        resetSignals: [],
        parameters: [],
        hierarchy: { moduleName: "uart", children: [] },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        specificationData: specData,
        rtlData: rtlData,
      });

      expect(result.success).toBe(true);
      const uartAgent = result.data.agentMappings.find((m: any) =>
        m.agentName.includes("uart"),
      );
      expect(uartAgent).toBeDefined();
      expect(uartAgent.agentType).toBe("active");
    });

    it("should handle missing specification data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        specificationData: null as any,
        rtlData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Specification data is required");
    });

    it("should handle missing RTL data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        specificationData: {} as any,
        rtlData: null as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("RTL data is required");
    });
  });
});
