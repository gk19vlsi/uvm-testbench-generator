/**
 * Scoreboard Generator
 * Generates scoreboard comparison logic based on strategy
 */

import { toUpperSnakeCase } from "./templateEngine";

/**
 * Scoreboard strategy types
 */
export type ScoreboardStrategy = "reference_model" | "transaction_comparison";

/**
 * Scoreboard pair configuration
 */
export interface ScoreboardPair {
  inputSignals: string[];
  outputSignals: string[];
  checkingStrategy: ScoreboardStrategy;
  description?: string;
}

/**
 * Generated scoreboard code
 */
export interface ScoreboardCode {
  transactionQueues: string;
  comparisonLogic: string;
  writeFunctions: string;
}

/**
 * Generate transaction queues
 */
function generateTransactionQueues(
  agents: any[],
  transactionTypes: Map<string, string>,
): string {
  const queues = agents.map((agent) => {
    const transType = transactionTypes.get(agent.name) || "transaction";
    return `  ${transType} ${agent.name}_queue[$];`;
  });

  return queues.join("\n");
}

/**
 * Generate reference model comparison logic
 */
function generateReferenceModelLogic(
  pair: ScoreboardPair,
  inputAgent: string,
  outputAgent: string,
): string {
  return `
    // Reference model comparison for ${pair.description || "DUT"}
    // Input signals: ${pair.inputSignals.join(", ")}
    // Output signals: ${pair.outputSignals.join(", ")}
    
    // TODO: Implement reference model
    // 1. Compute expected output from input transaction
    // 2. Compare with actual output transaction
    // 3. Report mismatches
    
    expected_trans = compute_expected_output(input_trans);
    
    if (!output_trans.compare(expected_trans)) begin
      \`uvm_error(get_type_name(), 
        $sformatf("Mismatch detected!\\nExpected: %s\\nActual: %s",
          expected_trans.convert2string(),
          output_trans.convert2string()))
      mismatches++;
    end else begin
      \`uvm_info(get_type_name(), "Transaction matched", UVM_HIGH)
      matches++;
    end`;
}

/**
 * Generate transaction comparison logic
 */
function generateTransactionComparisonLogic(
  pair: ScoreboardPair,
  inputAgent: string,
  outputAgent: string,
): string {
  return `
    // Transaction comparison for ${pair.description || "DUT"}
    // Comparing: ${inputAgent} -> ${outputAgent}
    
    // Wait for corresponding output transaction
    wait(${outputAgent}_queue.size() > 0);
    output_trans = ${outputAgent}_queue.pop_front();
    
    // Compare transactions
    if (!compare_transactions(input_trans, output_trans)) begin
      \`uvm_error(get_type_name(),
        $sformatf("Transaction mismatch!\\nInput: %s\\nOutput: %s",
          input_trans.convert2string(),
          output_trans.convert2string()))
      mismatches++;
    end else begin
      \`uvm_info(get_type_name(), "Transactions matched", UVM_HIGH)
      matches++;
    end`;
}

/**
 * Generate write functions for each agent
 */
function generateWriteFunctions(
  agents: any[],
  transactionTypes: Map<string, string>,
  pairs: ScoreboardPair[],
): string {
  return agents
    .map((agent) => {
      const transType = transactionTypes.get(agent.name) || "transaction";

      // Determine if this agent is input or output
      const isInput = pairs.some((p) =>
        p.inputSignals.some((s) => agent.name.includes(s.toLowerCase())),
      );

      const isOutput = pairs.some((p) =>
        p.outputSignals.some((s) => agent.name.includes(s.toLowerCase())),
      );

      let logic = "";
      if (isInput) {
        logic = `
    // Store input transaction for comparison
    ${agent.name}_queue.push_back(trans);
    \`uvm_info(get_type_name(), 
      $sformatf("Received input transaction from ${agent.name}: %s", 
        trans.convert2string()), UVM_MEDIUM)`;
      } else if (isOutput) {
        logic = `
    // Store output transaction for comparison
    ${agent.name}_queue.push_back(trans);
    \`uvm_info(get_type_name(),
      $sformatf("Received output transaction from ${agent.name}: %s",
        trans.convert2string()), UVM_MEDIUM)
    
    // Trigger comparison
    compare_transactions();`;
      } else {
        logic = `
    // Process transaction from ${agent.name}
    \`uvm_info(get_type_name(),
      $sformatf("Received transaction from ${agent.name}: %s",
        trans.convert2string()), UVM_MEDIUM)
    transactions_compared++;`;
      }

      return `
  virtual function void write_${agent.name}(${transType} trans);
${logic}
  endfunction : write_${agent.name}`;
    })
    .join("\n");
}

/**
 * Generate comparison logic based on strategy
 */
function generateComparisonLogic(
  pairs: ScoreboardPair[],
  agents: any[],
): string {
  if (pairs.length === 0) {
    return `
  // No specific comparison pairs defined
  // Implement custom comparison logic here
  virtual task compare_transactions();
    // TODO: Implement comparison logic
  endtask : compare_transactions`;
  }

  const comparisons = pairs.map((pair, idx) => {
    // Find input and output agents
    const inputAgent = agents.find((a) =>
      pair.inputSignals.some((s) => a.name.includes(s.toLowerCase())),
    );
    const outputAgent = agents.find((a) =>
      pair.outputSignals.some((s) => a.name.includes(s.toLowerCase())),
    );

    if (!inputAgent || !outputAgent) {
      return `// Pair ${idx + 1}: Could not determine agents`;
    }

    if (pair.checkingStrategy === "reference_model") {
      return generateReferenceModelLogic(
        pair,
        inputAgent.name,
        outputAgent.name,
      );
    } else {
      return generateTransactionComparisonLogic(
        pair,
        inputAgent.name,
        outputAgent.name,
      );
    }
  });

  return `
  // Comparison logic
  virtual task compare_transactions();
    // Wait for transactions to be available
    fork
${comparisons.map((c) => `      begin\n${c}\n      end`).join("\n")}
    join_none
  endtask : compare_transactions`;
}

/**
 * Generate complete scoreboard code
 */
export function generateScoreboardCode(
  agents: any[],
  transactionTypes: Map<string, string>,
  pairs: ScoreboardPair[],
): ScoreboardCode {
  return {
    transactionQueues: generateTransactionQueues(agents, transactionTypes),
    comparisonLogic: generateComparisonLogic(pairs, agents),
    writeFunctions: generateWriteFunctions(agents, transactionTypes, pairs),
  };
}

/**
 * Generate timing tolerance handling code
 */
export function generateTimingToleranceCode(
  toleranceCycles: number = 5,
): string {
  return `
  // Timing tolerance handling
  int tolerance_cycles = ${toleranceCycles};
  
  virtual task wait_with_tolerance(int cycles = tolerance_cycles);
    repeat(cycles) @(posedge vif.clk);
  endtask : wait_with_tolerance`;
}

/**
 * Generate error logging code
 */
export function generateErrorLoggingCode(): string {
  return `
  // Error logging
  int matches = 0;
  int mismatches = 0;
  
  virtual function void report_phase(uvm_phase phase);
    super.report_phase(phase);
    
    \`uvm_info(get_type_name(),
      $sformatf("Scoreboard Results:\\n  Matches: %0d\\n  Mismatches: %0d\\n  Total: %0d",
        matches, mismatches, matches + mismatches), UVM_LOW)
    
    if (mismatches > 0) begin
      \`uvm_error(get_type_name(),
        $sformatf("Scoreboard detected %0d mismatches!", mismatches))
    end
  endfunction : report_phase`;
}
