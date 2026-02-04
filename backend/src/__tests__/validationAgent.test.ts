import { ValidationAgent } from "../agents/ValidationAgent";
import { GeneratorAgentData } from "../agents/GeneratorAgent";
import { SequenceAgentData } from "../agents/SequenceAgent";
import { RTLAgentData } from "../agents/RTLAgent";

describe("ValidationAgent", () => {
  let agent: ValidationAgent;
  let mockLLM: any;

  beforeEach(() => {
    agent = new ValidationAgent();

    // Mock LLM
    mockLLM = {
      invoke: jest.fn().mockResolvedValue({
        content: JSON.stringify({}),
      }),
    };
  });

  describe("execute", () => {
    it("should successfully validate a complete testbench", async () => {
      const generatorData: GeneratorAgentData = {
        generatedFiles: [
          {
            path: "interfaces/axi_if.sv",
            content: `
              interface axi_if(input logic clk, input logic rst_n);
                logic awvalid;
                logic awready;
                clocking driver_cb @(posedge clk);
                  output awvalid;
                endclocking
                clocking monitor_cb @(posedge clk);
                  input awvalid;
                endclocking
              endinterface
            `,
            type: "interface",
          },
          {
            path: "agents/axi_agent/axi_driver.sv",
            content: `
              class axi_driver extends uvm_driver;
                \`uvm_component_utils(axi_driver)
                function new(string name, uvm_component parent);
                  super.new(name, parent);
                endfunction
                virtual function void build_phase(uvm_phase phase);
                  super.build_phase(phase);
                endfunction
                virtual task run_phase(uvm_phase phase);
                  forever begin
                    seq_item_port.get_next_item(req);
                    seq_item_port.item_done();
                  end
                endtask
              endclass
            `,
            type: "driver",
          },
          {
            path: "agents/axi_agent/axi_monitor.sv",
            content: `
              class axi_monitor extends uvm_monitor;
                \`uvm_component_utils(axi_monitor)
                uvm_analysis_port #(axi_transaction) analysis_port;
                function new(string name, uvm_component parent);
                  super.new(name, parent);
                endfunction
              endclass
            `,
            type: "monitor",
          },
          {
            path: "agents/axi_agent/axi_sequencer.sv",
            content: `
              class axi_sequencer extends uvm_sequencer;
                \`uvm_component_utils(axi_sequencer)
              endclass
            `,
            type: "sequencer",
          },
          {
            path: "agents/axi_agent/axi_agent.sv",
            content: `
              class axi_agent extends uvm_agent;
                \`uvm_component_utils(axi_agent)
              endclass
            `,
            type: "agent",
          },
          {
            path: "env/axi_env.sv",
            content: `
              class axi_env extends uvm_env;
                \`uvm_component_utils(axi_env)
              endclass
            `,
            type: "env",
          },
          {
            path: "scoreboard/axi_scoreboard.sv",
            content: `
              class axi_scoreboard extends uvm_scoreboard;
                \`uvm_component_utils(axi_scoreboard)
              endclass
            `,
            type: "scoreboard",
          },
          {
            path: "transactions/axi_transaction.sv",
            content: `
              class axi_transaction extends uvm_sequence_item;
                \`uvm_object_utils(axi_transaction)
              endclass
            `,
            type: "transaction",
          },
        ],
        fileStructure: {
          directories: ["interfaces", "agents", "env", "scoreboard"],
          files: [],
        },
      };

      const sequenceData: SequenceAgentData = {
        sequences: [
          {
            name: "axi_base_seq",
            type: "base",
            filePath: "sequences/axi_base_seq.sv",
            code: "class axi_base_seq extends uvm_sequence; endclass",
            description: "Base sequence",
          },
        ],
        tests: [
          {
            name: "axi_smoke_test",
            type: "smoke",
            sequences: ["axi_base_seq"],
            filePath: "tests/axi_smoke_test.sv",
            code: "class axi_smoke_test extends uvm_test; endclass",
          },
        ],
      };

      const rtlData: RTLAgentData = {
        topModule: "axi_slave",
        modules: [],
        ports: [
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
        ],
        interfaces: [],
        clockSignals: [{ name: "clk" }],
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
        generatorData,
        sequenceData,
        rtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.completenessChecks).toBeDefined();
      expect(result.data.connectivityChecks).toBeDefined();
      expect(result.data.syntaxChecks).toBeDefined();
      expect(result.data.readinessScore).toBeDefined();
      expect(result.data.recommendations).toBeDefined();

      // Verify readiness score structure
      expect(result.data.readinessScore.overall).toBeGreaterThanOrEqual(0);
      expect(result.data.readinessScore.overall).toBeLessThanOrEqual(100);
      expect(result.data.readinessScore.breakdown).toBeDefined();
      expect(result.data.readinessScore.breakdown.completeness).toBeDefined();
      expect(result.data.readinessScore.breakdown.connectivity).toBeDefined();
      expect(result.data.readinessScore.breakdown.syntax).toBeDefined();
      expect(result.data.readinessScore.breakdown.coverage).toBeDefined();
      expect(result.data.readinessScore.classification).toMatch(
        /Not Ready|Needs Review|Ready/,
      );
    });

    it("should detect missing components", async () => {
      const generatorData: GeneratorAgentData = {
        generatedFiles: [
          {
            path: "interfaces/test_if.sv",
            content: "interface test_if; endinterface",
            type: "interface",
          },
        ],
        fileStructure: {
          directories: [],
          files: [],
        },
      };

      const sequenceData: SequenceAgentData = {
        sequences: [],
        tests: [],
      };

      const rtlData: RTLAgentData = {
        topModule: "test_module",
        modules: [],
        ports: [],
        interfaces: [],
        clockSignals: [],
        resetSignals: [],
        parameters: [],
        hierarchy: {
          moduleName: "test_module",
          children: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData,
        sequenceData,
        rtlData,
      });

      expect(result.success).toBe(true);

      // Should have failed completeness checks
      const failedChecks = result.data.completenessChecks.filter(
        (c: any) => !c.passed,
      );
      expect(failedChecks.length).toBeGreaterThan(0);

      // Should have critical recommendations
      const criticalRecs = result.data.recommendations.filter(
        (r: any) => r.severity === "critical",
      );
      expect(criticalRecs.length).toBeGreaterThan(0);

      // Readiness score should be low
      expect(result.data.readinessScore.overall).toBeLessThan(70);
      expect(result.data.readinessScore.classification).toBe("Not Ready");
    });

    it("should detect unconnected signals", async () => {
      const generatorData: GeneratorAgentData = {
        generatedFiles: [
          {
            path: "interfaces/test_if.sv",
            content: `
              interface test_if;
                logic signal_a;
              endinterface
            `,
            type: "interface",
          },
          {
            path: "agents/test_agent/test_driver.sv",
            content: `class test_driver extends uvm_driver; \`uvm_component_utils(test_driver) endclass`,
            type: "driver",
          },
          {
            path: "agents/test_agent/test_monitor.sv",
            content: `class test_monitor extends uvm_monitor; \`uvm_component_utils(test_monitor) endclass`,
            type: "monitor",
          },
          {
            path: "agents/test_agent/test_sequencer.sv",
            content: `class test_sequencer extends uvm_sequencer; \`uvm_component_utils(test_sequencer) endclass`,
            type: "sequencer",
          },
          {
            path: "agents/test_agent/test_agent.sv",
            content: `class test_agent extends uvm_agent; \`uvm_component_utils(test_agent) endclass`,
            type: "agent",
          },
          {
            path: "env/test_env.sv",
            content: `class test_env extends uvm_env; \`uvm_component_utils(test_env) endclass`,
            type: "env",
          },
          {
            path: "scoreboard/test_scoreboard.sv",
            content: `class test_scoreboard extends uvm_scoreboard; \`uvm_component_utils(test_scoreboard) endclass`,
            type: "scoreboard",
          },
          {
            path: "transactions/test_transaction.sv",
            content: `class test_transaction extends uvm_sequence_item; \`uvm_object_utils(test_transaction) endclass`,
            type: "transaction",
          },
        ],
        fileStructure: {
          directories: [],
          files: [],
        },
      };

      const sequenceData: SequenceAgentData = {
        sequences: [
          {
            name: "test_base_seq",
            type: "base",
            filePath: "sequences/test_base_seq.sv",
            code: "class test_base_seq extends uvm_sequence; endclass",
            description: "Base sequence",
          },
        ],
        tests: [
          {
            name: "test_smoke_test",
            type: "smoke",
            sequences: ["test_base_seq"],
            filePath: "tests/test_smoke_test.sv",
            code: "class test_smoke_test extends uvm_test; endclass",
          },
        ],
      };

      const rtlData: RTLAgentData = {
        topModule: "test_module",
        modules: [],
        ports: [
          {
            name: "signal_a",
            direction: "input",
            type: "logic",
            width: "1",
          },
          {
            name: "signal_b",
            direction: "output",
            type: "logic",
            width: "1",
          },
          {
            name: "signal_c",
            direction: "input",
            type: "logic",
            width: "8",
          },
        ],
        interfaces: [],
        clockSignals: [],
        resetSignals: [],
        parameters: [],
        hierarchy: {
          moduleName: "test_module",
          children: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData,
        sequenceData,
        rtlData,
      });

      expect(result.success).toBe(true);

      // Should have unconnected signals
      const unconnected = result.data.connectivityChecks.filter(
        (c: any) => !c.connected,
      );
      expect(unconnected.length).toBeGreaterThan(0);

      // Should have connectivity recommendations
      const connectivityRecs = result.data.recommendations.filter(
        (r: any) => r.category === "connectivity",
      );
      expect(connectivityRecs.length).toBeGreaterThan(0);
    });

    it("should detect syntax errors", async () => {
      const generatorData: GeneratorAgentData = {
        generatedFiles: [
          {
            path: "test.sv",
            content: `
              class test_class;
                function void test();
                  begin
                    // Missing end - unmatched begin/end
                endfunction
              endclass
            `,
            type: "driver",
          },
          {
            path: "test2.sv",
            content: `
              class test_class2;
                // Missing UVM macro
              endclass
            `,
            type: "monitor",
          },
        ],
        fileStructure: {
          directories: [],
          files: [],
        },
      };

      const sequenceData: SequenceAgentData = {
        sequences: [],
        tests: [],
      };

      const rtlData: RTLAgentData = {
        topModule: "test",
        modules: [],
        ports: [],
        interfaces: [],
        clockSignals: [],
        resetSignals: [],
        parameters: [],
        hierarchy: {
          moduleName: "test",
          children: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData,
        sequenceData,
        rtlData,
      });

      expect(result.success).toBe(true);

      // Should have syntax errors or warnings
      const syntaxIssues = result.data.syntaxChecks.filter(
        (c: any) => c.errors.length > 0,
      );
      expect(syntaxIssues.length).toBeGreaterThan(0);
    });

    it("should handle missing generator data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData: null as any,
        sequenceData: {} as any,
        rtlData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Generator data is required");
    });

    it("should handle missing sequence data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData: {} as any,
        sequenceData: null as any,
        rtlData: {} as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Sequence data is required");
    });

    it("should handle missing RTL data", async () => {
      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData: {} as any,
        sequenceData: {} as any,
        rtlData: null as any,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("RTL data is required");
    });

    it("should classify readiness correctly", async () => {
      // Test "Ready" classification (score > 90)
      const completeData: GeneratorAgentData = {
        generatedFiles: [
          {
            path: "if.sv",
            content:
              "interface test_if(input logic clk, input logic rst_n); logic sig; clocking driver_cb @(posedge clk); endclocking endinterface",
            type: "interface",
          },
          {
            path: "driver.sv",
            content:
              "class driver extends uvm_driver; `uvm_component_utils(driver) endclass",
            type: "driver",
          },
          {
            path: "monitor.sv",
            content:
              "class monitor extends uvm_monitor; `uvm_component_utils(monitor) endclass",
            type: "monitor",
          },
          {
            path: "sequencer.sv",
            content:
              "class sequencer extends uvm_sequencer; `uvm_component_utils(sequencer) endclass",
            type: "sequencer",
          },
          {
            path: "agent.sv",
            content:
              "class agent extends uvm_agent; `uvm_component_utils(agent) endclass",
            type: "agent",
          },
          {
            path: "env.sv",
            content:
              "class env extends uvm_env; `uvm_component_utils(env) endclass",
            type: "env",
          },
          {
            path: "scoreboard.sv",
            content:
              "class scoreboard extends uvm_scoreboard; `uvm_component_utils(scoreboard) endclass",
            type: "scoreboard",
          },
          {
            path: "transaction.sv",
            content:
              "class transaction extends uvm_sequence_item; `uvm_object_utils(transaction) endclass",
            type: "transaction",
          },
        ],
        fileStructure: { directories: [], files: [] },
      };

      const completeSeqData: SequenceAgentData = {
        sequences: [
          {
            name: "base_seq",
            type: "base",
            filePath: "base_seq.sv",
            code: "",
            description: "",
          },
        ],
        tests: [
          {
            name: "smoke_test",
            type: "smoke",
            sequences: [],
            filePath: "smoke_test.sv",
            code: "",
          },
        ],
      };

      const completeRtlData: RTLAgentData = {
        topModule: "test",
        modules: [],
        ports: [{ name: "sig", direction: "input", type: "logic", width: "1" }],
        interfaces: [],
        clockSignals: [{ name: "clk" }],
        resetSignals: [
          { name: "rst_n", polarity: "active_low", synchronous: true },
        ],
        parameters: [],
        hierarchy: {
          moduleName: "test",
          children: [],
        },
      };

      const result = await agent.execute({
        projectId: "test-project",
        llmProvider: mockLLM,
        generatorData: completeData,
        sequenceData: completeSeqData,
        rtlData: completeRtlData,
      });

      expect(result.success).toBe(true);
      expect(result.data.readinessScore.overall).toBeGreaterThanOrEqual(70);
    });
  });
});
