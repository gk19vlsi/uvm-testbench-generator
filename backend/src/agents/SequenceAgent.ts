import { BaseAgent, AgentInput, AgentOutput } from "./BaseAgent";
import { SpecificationAgentData } from "./SpecificationAgent";
import { ArchitectureAgentData } from "./ArchitectureAgent";
import { GeneratorAgentData } from "./GeneratorAgent";
import {
  fillTemplateFromFile,
  toUpperSnakeCase,
  cleanEmptyPlaceholders,
} from "../utils/templateEngine";
import { generateTransactionTypeName } from "../utils/namingConvention";
import logger from "../config/logger";

/**
 * Sequence definition
 */
export interface SequenceDefinition {
  name: string;
  type: "base" | "directed" | "error" | "random" | "stress";
  filePath: string;
  code: string;
  description: string;
}

/**
 * Test definition
 */
export interface TestDefinition {
  name: string;
  type: "smoke" | "random" | "directed" | "stress";
  sequences: string[];
  filePath: string;
  code: string;
}

/**
 * Sequence Agent input
 */
export interface SequenceAgentInput extends AgentInput {
  architectureData: ArchitectureAgentData;
  specificationData: SpecificationAgentData;
  generatorData: GeneratorAgentData;
}

/**
 * Sequence Agent output data
 */
export interface SequenceAgentData {
  sequences: SequenceDefinition[];
  tests: TestDefinition[];
}

/**
 * Sequence and Test Generator Agent
 *
 * Generates stimulus sequences and tests by:
 * - Creating base sequence classes
 * - Generating directed sequences from specification scenarios
 * - Generating error injection sequences
 * - Generating random sequences with constraints
 * - Generating stress sequences
 * - Creating smoke, random, directed, and stress tests
 *
 * Requirements: 8.1-8.6
 */
export class SequenceAgent extends BaseAgent {
  constructor() {
    super("Sequence Agent");
  }

  /**
   * Execute sequence and test generation
   */
  public async execute(input: SequenceAgentInput): Promise<AgentOutput> {
    const startTime = Date.now();

    try {
      this.validateInput(input);
      this.sendProgress("started", "Starting sequence and test generation...");

      // Validate input data
      if (!input.architectureData) {
        throw new Error("Architecture data is required");
      }
      if (!input.specificationData) {
        throw new Error("Specification data is required");
      }
      if (!input.generatorData) {
        throw new Error("Generator data is required");
      }

      this.sendProgress("in_progress", "Generating sequences...", {
        agents: input.architectureData.agents.length,
      });

      const sequences: SequenceDefinition[] = [];
      const tests: TestDefinition[] = [];

      // Generate sequences for each active agent
      for (const agent of input.architectureData.agents) {
        if (agent.type === "active") {
          this.sendProgress(
            "in_progress",
            `Generating sequences for ${agent.name}...`,
          );

          // Generate base sequence
          const baseSeq = await this.generateBaseSequence(agent);
          sequences.push(baseSeq);

          // Generate directed sequences from specification scenarios
          const directedSeqs = await this.generateDirectedSequences(
            agent,
            input.specificationData,
            baseSeq.name,
          );
          sequences.push(...directedSeqs);

          // Generate error injection sequences
          const errorSeqs = await this.generateErrorSequences(
            agent,
            input.specificationData,
            baseSeq.name,
          );
          sequences.push(...errorSeqs);

          // Generate random sequence with constraints
          const randomSeq = await this.generateRandomSequence(
            agent,
            input.specificationData,
            baseSeq.name,
          );
          sequences.push(randomSeq);

          // Generate stress sequence
          const stressSeq = await this.generateStressSequence(
            agent,
            baseSeq.name,
          );
          sequences.push(stressSeq);
        }
      }

      this.sendProgress("in_progress", "Generating tests...", {
        sequenceCount: sequences.length,
      });

      // Generate smoke test
      const smokeTest = await this.generateSmokeTest(
        input.architectureData,
        sequences,
      );
      tests.push(smokeTest);

      // Generate random test
      const randomTest = await this.generateRandomTest(
        input.architectureData,
        sequences,
      );
      tests.push(randomTest);

      // Generate directed tests for specification scenarios
      const directedTests = await this.generateDirectedTests(
        input.architectureData,
        input.specificationData,
        sequences,
      );
      tests.push(...directedTests);

      // Generate stress test
      const stressTest = await this.generateStressTest(
        input.architectureData,
        sequences,
      );
      tests.push(stressTest);

      const data: SequenceAgentData = {
        sequences,
        tests,
      };

      this.sendProgress("completed", "Sequence and test generation complete", {
        sequencesGenerated: sequences.length,
        testsGenerated: tests.length,
      });

      return this.createOutput(true, data, startTime);
    } catch (error: any) {
      logger.error(`Sequence Agent failed:`, error);
      this.sendProgress("failed", `Generation failed: ${error.message}`);
      return this.createOutput(false, null, startTime, error.message);
    }
  }

  /**
   * Generate base sequence for an agent
   */
  private async generateBaseSequence(agent: any): Promise<SequenceDefinition> {
    const baseName = agent.name.replace("_agent", "");
    const sequenceName = `${baseName}_base_seq`;
    const transactionType = generateTransactionTypeName(agent.name);

    const templateData = {
      SEQUENCE_NAME: sequenceName,
      SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
      AGENT_NAME: agent.name,
      TRANSACTION_TYPE: transactionType,
    };

    const code = await fillTemplateFromFile(
      "uvm/base_sequence.sv.template",
      templateData,
    );

    return {
      name: sequenceName,
      type: "base",
      filePath: `sequences/${sequenceName}.sv`,
      code: cleanEmptyPlaceholders(code),
      description: `Base sequence class for ${agent.name} with transaction randomization`,
    };
  }

  /**
   * Generate directed sequences from specification scenarios
   */
  private async generateDirectedSequences(
    agent: any,
    specificationData: SpecificationAgentData,
    baseSequenceName: string,
  ): Promise<SequenceDefinition[]> {
    const sequences: SequenceDefinition[] = [];
    const baseName = agent.name.replace("_agent", "");

    // Generate directed sequences for each transaction type
    for (const transaction of specificationData.transactions) {
      const sequenceName = `${baseName}_${transaction.name.toLowerCase()}_seq`;
      const scenarioName = transaction.name;

      // Generate directed logic based on transaction fields
      const directedLogic = this.generateDirectedLogic(transaction);

      const templateData = {
        SEQUENCE_NAME: sequenceName,
        SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
        BASE_SEQUENCE: baseSequenceName,
        SCENARIO_NAME: scenarioName,
        DIRECTED_LOGIC: directedLogic,
      };

      const code = await fillTemplateFromFile(
        "uvm/directed_sequence.sv.template",
        templateData,
      );

      sequences.push({
        name: sequenceName,
        type: "directed",
        filePath: `sequences/${sequenceName}.sv`,
        code: cleanEmptyPlaceholders(code),
        description: `Directed sequence for ${scenarioName} scenario`,
      });
    }

    return sequences;
  }

  /**
   * Generate directed logic for a transaction
   */
  private generateDirectedLogic(transaction: any): string {
    const logic: string[] = [];

    logic.push(
      `    // Create and configure transaction for ${transaction.name}`,
    );
    logic.push(`    \`uvm_do_with(req, {`);

    // Add constraints for each field
    for (const field of transaction.fields) {
      if (field.constraints && field.constraints.length > 0) {
        logic.push(`      // ${field.name}: ${field.constraints.join(", ")}`);
        logic.push(`      ${field.name} == 0; // TODO: Set specific value`);
      }
    }

    logic.push(`    })`);

    return logic.join("\n");
  }

  /**
   * Generate error injection sequences
   */
  private async generateErrorSequences(
    agent: any,
    specificationData: SpecificationAgentData,
    baseSequenceName: string,
  ): Promise<SequenceDefinition[]> {
    const sequences: SequenceDefinition[] = [];
    const baseName = agent.name.replace("_agent", "");

    // Generate error sequences for each error scenario
    for (const errorScenario of specificationData.errorScenarios) {
      const sequenceName = `${baseName}_${errorScenario.name.toLowerCase().replace(/\s+/g, "_")}_error_seq`;

      // Generate error injection logic
      const errorInjectionLogic =
        this.generateErrorInjectionLogic(errorScenario);

      const templateData = {
        SEQUENCE_NAME: sequenceName,
        SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
        BASE_SEQUENCE: baseSequenceName,
        ERROR_INJECTION_LOGIC: errorInjectionLogic,
      };

      const code = await fillTemplateFromFile(
        "uvm/error_sequence.sv.template",
        templateData,
      );

      sequences.push({
        name: sequenceName,
        type: "error",
        filePath: `sequences/${sequenceName}.sv`,
        code: cleanEmptyPlaceholders(code),
        description: `Error injection sequence for ${errorScenario.name}`,
      });
    }

    // If no error scenarios, generate a generic error sequence
    if (sequences.length === 0) {
      const sequenceName = `${baseName}_generic_error_seq`;

      const templateData = {
        SEQUENCE_NAME: sequenceName,
        SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
        BASE_SEQUENCE: baseSequenceName,
        ERROR_INJECTION_LOGIC: `    // Generic error injection
    \`uvm_do_with(req, {
      // TODO: Add protocol violation constraints
    })`,
      };

      const code = await fillTemplateFromFile(
        "uvm/error_sequence.sv.template",
        templateData,
      );

      sequences.push({
        name: sequenceName,
        type: "error",
        filePath: `sequences/${sequenceName}.sv`,
        code: cleanEmptyPlaceholders(code),
        description: `Generic error injection sequence`,
      });
    }

    return sequences;
  }

  /**
   * Generate error injection logic
   */
  private generateErrorInjectionLogic(errorScenario: any): string {
    const logic: string[] = [];

    logic.push(`    // Inject error: ${errorScenario.name}`);
    logic.push(`    // Condition: ${errorScenario.condition}`);
    logic.push(`    // Expected response: ${errorScenario.expectedResponse}`);
    logic.push(`    `);
    logic.push(`    \`uvm_do_with(req, {`);
    logic.push(`      // TODO: Add constraints to trigger error condition`);
    logic.push(`    })`);

    return logic.join("\n");
  }

  /**
   * Generate random sequence with constraints
   */
  private async generateRandomSequence(
    agent: any,
    specificationData: SpecificationAgentData,
    baseSequenceName: string,
  ): Promise<SequenceDefinition> {
    const baseName = agent.name.replace("_agent", "");
    const sequenceName = `${baseName}_random_seq`;

    // Generate random constraints based on transactions
    const randomConstraints = this.generateRandomConstraints(
      specificationData.transactions,
    );

    const templateData = {
      SEQUENCE_NAME: sequenceName,
      SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
      BASE_SEQUENCE: baseSequenceName,
      RANDOM_CONSTRAINTS: randomConstraints,
    };

    const code = await fillTemplateFromFile(
      "uvm/random_sequence.sv.template",
      templateData,
    );

    return {
      name: sequenceName,
      type: "random",
      filePath: `sequences/${sequenceName}.sv`,
      code: cleanEmptyPlaceholders(code),
      description: `Random sequence with constrained-random stimulus`,
    };
  }

  /**
   * Generate random constraints
   */
  private generateRandomConstraints(transactions: any[]): string {
    const constraints: string[] = [];

    if (transactions.length > 0) {
      const transaction = transactions[0];

      for (const field of transaction.fields) {
        if (field.constraints && field.constraints.length > 0) {
          constraints.push(
            `        // ${field.name}: ${field.constraints.join(", ")}`,
          );
        }
      }
    }

    if (constraints.length === 0) {
      constraints.push(`        // Add random constraints here`);
    }

    return constraints.join("\n");
  }

  /**
   * Generate stress sequence
   */
  private async generateStressSequence(
    agent: any,
    baseSequenceName: string,
  ): Promise<SequenceDefinition> {
    const baseName = agent.name.replace("_agent", "");
    const sequenceName = `${baseName}_stress_seq`;

    // Stress sequences use random constraints with high transaction count
    const templateData = {
      SEQUENCE_NAME: sequenceName,
      SEQUENCE_NAME_UPPER: toUpperSnakeCase(sequenceName),
      BASE_SEQUENCE: baseSequenceName,
      RANDOM_CONSTRAINTS: `        // Back-to-back transactions with minimal delays`,
    };

    const code = await fillTemplateFromFile(
      "uvm/random_sequence.sv.template",
      templateData,
    );

    // Modify the code to increase transaction count
    const modifiedCode = code.replace(
      "num_transactions inside {[1:10]};",
      "num_transactions inside {[100:200]};",
    );

    return {
      name: sequenceName,
      type: "stress",
      filePath: `sequences/${sequenceName}.sv`,
      code: cleanEmptyPlaceholders(modifiedCode),
      description: `Stress sequence with back-to-back transactions`,
    };
  }

  /**
   * Generate smoke test
   */
  private async generateSmokeTest(
    architectureData: ArchitectureAgentData,
    sequences: SequenceDefinition[],
  ): Promise<TestDefinition> {
    const testName = `${architectureData.environmentHierarchy.topEnv.replace("_env", "")}_smoke_test`;
    const envType = architectureData.environmentHierarchy.topEnv;

    // Find first active agent and its base sequence
    const firstActiveAgent = architectureData.agents.find(
      (a) => a.type === "active",
    );

    if (!firstActiveAgent) {
      throw new Error("No active agents found for test generation");
    }

    const baseSequence = sequences.find(
      (s) =>
        s.type === "base" &&
        s.name.includes(firstActiveAgent.name.replace("_agent", "")),
    );

    if (!baseSequence) {
      throw new Error(`Base sequence not found for ${firstActiveAgent.name}`);
    }

    const sequencerPath = `env.${firstActiveAgent.name}.sequencer`;

    const templateData = {
      TEST_NAME: testName,
      TEST_NAME_UPPER: toUpperSnakeCase(testName),
      ENV_TYPE: envType,
      BASE_SEQUENCE: baseSequence.name,
      SEQUENCER_PATH: sequencerPath,
    };

    const code = await fillTemplateFromFile(
      "uvm/smoke_test.sv.template",
      templateData,
    );

    return {
      name: testName,
      type: "smoke",
      sequences: [baseSequence.name],
      filePath: `tests/${testName}.sv`,
      code: cleanEmptyPlaceholders(code),
    };
  }

  /**
   * Generate random test
   */
  private async generateRandomTest(
    architectureData: ArchitectureAgentData,
    sequences: SequenceDefinition[],
  ): Promise<TestDefinition> {
    const testName = `${architectureData.environmentHierarchy.topEnv.replace("_env", "")}_random_test`;
    const envType = architectureData.environmentHierarchy.topEnv;

    // Find first active agent and its random sequence
    const firstActiveAgent = architectureData.agents.find(
      (a) => a.type === "active",
    );

    if (!firstActiveAgent) {
      throw new Error("No active agents found for test generation");
    }

    const randomSequence = sequences.find(
      (s) =>
        s.type === "random" &&
        s.name.includes(firstActiveAgent.name.replace("_agent", "")),
    );

    if (!randomSequence) {
      throw new Error(`Random sequence not found for ${firstActiveAgent.name}`);
    }

    const sequencerPath = `env.${firstActiveAgent.name}.sequencer`;

    const templateData = {
      TEST_NAME: testName,
      TEST_NAME_UPPER: toUpperSnakeCase(testName),
      ENV_TYPE: envType,
      RANDOM_SEQUENCE: randomSequence.name,
      SEQUENCER_PATH: sequencerPath,
    };

    const code = await fillTemplateFromFile(
      "uvm/random_test.sv.template",
      templateData,
    );

    return {
      name: testName,
      type: "random",
      sequences: [randomSequence.name],
      filePath: `tests/${testName}.sv`,
      code: cleanEmptyPlaceholders(code),
    };
  }

  /**
   * Generate directed tests for specification scenarios
   */
  private async generateDirectedTests(
    architectureData: ArchitectureAgentData,
    specificationData: SpecificationAgentData,
    sequences: SequenceDefinition[],
  ): Promise<TestDefinition[]> {
    const tests: TestDefinition[] = [];

    // Generate a directed test for each transaction type
    for (const transaction of specificationData.transactions) {
      const testName = `${architectureData.environmentHierarchy.topEnv.replace("_env", "")}_${transaction.name.toLowerCase()}_test`;
      const envType = architectureData.environmentHierarchy.topEnv;

      // Find the directed sequence for this transaction
      const directedSequence = sequences.find(
        (s) =>
          s.type === "directed" &&
          s.name.includes(transaction.name.toLowerCase()),
      );

      if (!directedSequence) {
        continue;
      }

      // Find the agent for this sequence
      const agent = architectureData.agents.find((a) =>
        directedSequence.name.includes(a.name.replace("_agent", "")),
      );

      if (!agent) {
        continue;
      }

      const sequencerPath = `env.${agent.name}.sequencer`;

      // Create a simple directed test template
      const code = `// ${testName}.sv
// Directed Test for ${transaction.name}
// Generated by UVM Testbench Chatbot

\`ifndef ${toUpperSnakeCase(testName)}_SV
\`define ${toUpperSnakeCase(testName)}_SV

class ${testName} extends uvm_test;
  \`uvm_component_utils(${testName})

  // Environment handle
  ${envType} env;

  // Constructor
  function new(string name = "${testName}", uvm_component parent = null);
    super.new(name, parent);
  endfunction : new

  // Build phase - create environment
  virtual function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    env = ${envType}::type_id::create("env", this);
  endfunction : build_phase

  // Run phase - execute test
  virtual task run_phase(uvm_phase phase);
    ${directedSequence.name} seq;
    
    phase.raise_objection(this, "Starting directed test");
    
    \`uvm_info(get_type_name(), "=== Directed Test for ${transaction.name} Started ===", UVM_LOW)
    
    // Create and start directed sequence
    seq = ${directedSequence.name}::type_id::create("seq");
    seq.start(${sequencerPath});
    
    // Wait for transactions to complete
    #5000ns;
    
    \`uvm_info(get_type_name(), "=== Directed Test Completed ===", UVM_LOW)
    
    phase.drop_objection(this, "Directed test completed");
  endtask : run_phase

endclass : ${testName}

\`endif // ${toUpperSnakeCase(testName)}_SV
`;

      tests.push({
        name: testName,
        type: "directed",
        sequences: [directedSequence.name],
        filePath: `tests/${testName}.sv`,
        code: cleanEmptyPlaceholders(code),
      });
    }

    return tests;
  }

  /**
   * Generate stress test
   */
  private async generateStressTest(
    architectureData: ArchitectureAgentData,
    sequences: SequenceDefinition[],
  ): Promise<TestDefinition> {
    const testName = `${architectureData.environmentHierarchy.topEnv.replace("_env", "")}_stress_test`;
    const envType = architectureData.environmentHierarchy.topEnv;

    // Find first active agent and its stress sequence
    const firstActiveAgent = architectureData.agents.find(
      (a) => a.type === "active",
    );

    if (!firstActiveAgent) {
      throw new Error("No active agents found for test generation");
    }

    const stressSequence = sequences.find(
      (s) =>
        s.type === "stress" &&
        s.name.includes(firstActiveAgent.name.replace("_agent", "")),
    );

    if (!stressSequence) {
      throw new Error(`Stress sequence not found for ${firstActiveAgent.name}`);
    }

    const sequencerPath = `env.${firstActiveAgent.name}.sequencer`;

    // Create stress test code
    const code = `// ${testName}.sv
// Stress Test with Back-to-Back Transactions
// Generated by UVM Testbench Chatbot

\`ifndef ${toUpperSnakeCase(testName)}_SV
\`define ${toUpperSnakeCase(testName)}_SV

class ${testName} extends uvm_test;
  \`uvm_component_utils(${testName})

  // Environment handle
  ${envType} env;

  // Constructor
  function new(string name = "${testName}", uvm_component parent = null);
    super.new(name, parent);
  endfunction : new

  // Build phase - create environment
  virtual function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    env = ${envType}::type_id::create("env", this);
  endfunction : build_phase

  // Run phase - execute test
  virtual task run_phase(uvm_phase phase);
    ${stressSequence.name} seq;
    
    phase.raise_objection(this, "Starting stress test");
    
    \`uvm_info(get_type_name(), "=== Stress Test Started ===", UVM_LOW)
    
    // Create and start stress sequence
    seq = ${stressSequence.name}::type_id::create("seq");
    assert(seq.randomize() with {
      num_transactions inside {[100:200]};
    });
    seq.start(${sequencerPath});
    
    // Wait for transactions to complete
    #50000ns;
    
    \`uvm_info(get_type_name(), "=== Stress Test Completed ===", UVM_LOW)
    
    phase.drop_objection(this, "Stress test completed");
  endtask : run_phase

endclass : ${testName}

\`endif // ${toUpperSnakeCase(testName)}_SV
`;

    return {
      name: testName,
      type: "stress",
      sequences: [stressSequence.name],
      filePath: `tests/${testName}.sv`,
      code: cleanEmptyPlaceholders(code),
    };
  }
}

// Export singleton instance
export const sequenceAgent = new SequenceAgent();
