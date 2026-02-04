/**
 * Reset Sequence Generator
 * Generates reset assertion/deassertion logic for testbench top module
 */

/**
 * Reset signal configuration
 */
export interface ResetSignal {
  name: string;
  polarity: "active_high" | "active_low";
  synchronous?: boolean;
  duration?: number; // Duration in clock cycles
}

/**
 * Generated reset sequence code
 */
export interface ResetSequenceCode {
  declarations: string;
  initialization: string;
  resetTask: string;
}

/**
 * Generate reset sequence for a single reset signal
 */
export function generateResetSequence(
  reset: ResetSignal,
  clockSignal: string = "clk",
): string {
  const duration = reset.duration || 10; // Default 10 cycles

  if (reset.polarity === "active_low") {
    // Active-low reset: initial 1, assert to 0, then back to 1
    return `
    // Assert active-low reset
    ${reset.name} = 1'b1;
    #10;
    ${reset.name} = 1'b0;
    repeat(${duration}) @(posedge ${clockSignal});
    ${reset.name} = 1'b1;
    repeat(2) @(posedge ${clockSignal});
    \`uvm_info("TB_TOP", "Reset deassertion complete (active-low)", UVM_LOW)`;
  } else {
    // Active-high reset: initial 0, assert to 1, then back to 0
    return `
    // Assert active-high reset
    ${reset.name} = 1'b0;
    #10;
    ${reset.name} = 1'b1;
    repeat(${duration}) @(posedge ${clockSignal});
    ${reset.name} = 1'b0;
    repeat(2) @(posedge ${clockSignal});
    \`uvm_info("TB_TOP", "Reset deassertion complete (active-high)", UVM_LOW)`;
  }
}

/**
 * Generate coordinated reset sequence for multiple reset signals
 */
export function generateMultiResetSequence(
  resets: ResetSignal[],
  clockSignal: string = "clk",
): string {
  if (resets.length === 0) {
    return `
    // No reset signals defined
    #100;
    \`uvm_info("TB_TOP", "No reset sequence (no reset signals)", UVM_LOW)`;
  }

  if (resets.length === 1) {
    return generateResetSequence(resets[0], clockSignal);
  }

  // Multiple resets - coordinate them
  const maxDuration = Math.max(...resets.map((r) => r.duration || 10));

  // Initialize all resets to inactive state
  const initializations = resets
    .map((reset) => {
      const inactiveValue = reset.polarity === "active_low" ? "1'b1" : "1'b0";
      return `    ${reset.name} = ${inactiveValue};`;
    })
    .join("\n");

  // Assert all resets
  const assertions = resets
    .map((reset) => {
      const activeValue = reset.polarity === "active_low" ? "1'b0" : "1'b1";
      return `    ${reset.name} = ${activeValue};`;
    })
    .join("\n");

  // Deassert all resets
  const deassertions = resets
    .map((reset) => {
      const inactiveValue = reset.polarity === "active_low" ? "1'b1" : "1'b0";
      return `    ${reset.name} = ${inactiveValue};`;
    })
    .join("\n");

  return `
    // Initialize all resets to inactive state
${initializations}
    #10;
    
    // Assert all resets simultaneously
${assertions}
    repeat(${maxDuration}) @(posedge ${clockSignal});
    
    // Deassert all resets simultaneously
${deassertions}
    repeat(2) @(posedge ${clockSignal});
    \`uvm_info("TB_TOP", "Multi-reset sequence complete", UVM_LOW)`;
}

/**
 * Generate reset declarations for tb_top
 */
export function generateResetDeclarations(resets: ResetSignal[]): string {
  if (resets.length === 0) {
    return "  // No reset signals";
  }

  return resets.map((reset) => `  logic ${reset.name};`).join("\n");
}

/**
 * Generate reset initialization in initial block
 */
export function generateResetInitialization(resets: ResetSignal[]): string {
  if (resets.length === 0) {
    return "    // No reset initialization";
  }

  return resets
    .map((reset) => {
      const initialValue = reset.polarity === "active_low" ? "1'b1" : "1'b0";
      return `    ${reset.name} = ${initialValue};`;
    })
    .join("\n");
}

/**
 * Generate complete reset sequence code for tb_top
 */
export function generateResetSequenceCode(
  resets: ResetSignal[],
  clockSignal: string = "clk",
): ResetSequenceCode {
  return {
    declarations: generateResetDeclarations(resets),
    initialization: generateResetInitialization(resets),
    resetTask: generateMultiResetSequence(resets, clockSignal),
  };
}

/**
 * Generate reset connection to DUT
 */
export function generateResetConnections(
  resets: ResetSignal[],
  dutInstanceName: string = "dut",
): string {
  if (resets.length === 0) {
    return "    // No reset connections";
  }

  return resets.map((reset) => `    .${reset.name}(${reset.name})`).join(",\n");
}

/**
 * Generate reset connection to interface
 */
export function generateResetInterfaceConnections(
  resets: ResetSignal[],
  interfaceInstanceName: string,
): string {
  if (resets.length === 0) {
    return "    // No reset connections";
  }

  return resets.map((reset) => `    .${reset.name}(${reset.name})`).join(",\n");
}
