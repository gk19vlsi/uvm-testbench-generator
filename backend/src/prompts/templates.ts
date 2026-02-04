/**
 * LLM Prompt Templates for UVM Testbench Generation
 *
 * These templates are used by the multi-agent pipeline to guide LLM responses
 * for each stage of testbench generation.
 */

/**
 * Specification Analysis Prompt Template
 *
 * Used by Specification Agent to extract verification requirements from
 * specification documents.
 *
 * Requirements: 3.1-3.5
 */
export const SPECIFICATION_ANALYSIS_PROMPT = `
You are an expert verification engineer analyzing a specification document to extract verification requirements.

Your task is to analyze the following specification and extract structured information in JSON format.

SPECIFICATION CONTENT:
{specificationText}

Extract the following information:

1. **Protocols**: Identify any standard communication protocols mentioned (AXI, APB, UART, I2C, SPI, or CUSTOM).
   For each protocol, provide:
   - name: Protocol name
   - confidence: Confidence score (0.0 to 1.0)
   - signals: List of signal names associated with this protocol
   - characteristics: Any protocol-specific details (bus width, addressing mode, etc.)

2. **Transactions**: List all transaction types that need to be verified.
   For each transaction, provide:
   - name: Transaction name
   - fields: Array of field objects with name, type, width (if applicable), and constraints
   - constraints: List of constraints or rules for this transaction

3. **Timing Constraints**: Extract timing requirements.
   Provide:
   - clockDomains: Array of clock domain objects with name and frequency (if specified)
   - resetConditions: Array of reset signal objects with name and polarity (active_high/active_low)
   - timingRequirements: Array of timing constraint descriptions

4. **Coverage Goals**: Identify functional coverage requirements.
   Provide:
   - functionalCoverage: Array of coverage point descriptions
   - crossCoverage: Array of cross-coverage requirements between signals

5. **Error Scenarios**: Catalog error conditions and expected responses.
   Provide:
   - scenarios: Array of error scenario objects with name, condition, and expectedResponse

Respond ONLY with valid JSON in this exact format:
{
  "protocols": [
    {
      "name": "AXI",
      "confidence": 0.95,
      "signals": ["awvalid", "awready", "wdata"],
      "characteristics": { "busWidth": 32, "addressWidth": 32 }
    }
  ],
  "transactions": [
    {
      "name": "WriteTransaction",
      "fields": [
        { "name": "address", "type": "bit", "width": 32, "constraints": ["address % 4 == 0"] }
      ],
      "constraints": ["address must be 4-byte aligned"]
    }
  ],
  "timingConstraints": {
    "clockDomains": [
      { "name": "clk", "frequency": 100000000 }
    ],
    "resetConditions": [
      { "name": "rst_n", "polarity": "active_low" }
    ],
    "timingRequirements": ["Setup time: 2ns", "Hold time: 1ns"]
  },
  "coverageGoals": {
    "functionalCoverage": ["Cover all transaction types", "Cover address ranges"],
    "crossCoverage": ["Cross address and data values"]
  },
  "errorScenarios": [
    {
      "name": "InvalidAddress",
      "condition": "Unaligned address access",
      "expectedResponse": "Error response with SLVERR"
    }
  ],
  "verificationIntent": "Brief summary of overall verification goals"
}
`;

/**
 * RTL Analysis Prompt Template
 *
 * Used by RTL Agent to analyze RTL design structure when static parsing
 * encounters ambiguities or complex constructs.
 *
 * Requirements: 4.1-4.5
 */
export const RTL_ANALYSIS_PROMPT = `
You are an expert RTL design engineer analyzing SystemVerilog/Verilog code.

Your task is to analyze the following RTL code and extract design structure information.

RTL CODE:
{rtlCode}

PARSED INFORMATION (from static analysis):
{parsedInfo}

Please help clarify or enhance the following aspects:

1. **Module Hierarchy**: Confirm parent-child relationships between modules
2. **Signal Classification**: Identify clock signals, reset signals, and protocol-specific patterns
3. **Interface Groupings**: Suggest logical groupings of related signals
4. **Parameters**: Clarify any parameter dependencies or computed values

Focus on areas where the static parser may have encountered ambiguities.

Respond ONLY with valid JSON in this exact format:
{
  "signalClassification": {
    "clocks": [
      { "name": "clk", "frequency": 100000000, "dutyCycle": 50 }
    ],
    "resets": [
      { "name": "rst_n", "polarity": "active_low", "synchronous": true }
    ],
    "protocolSignals": {
      "AXI": ["awvalid", "awready", "wdata", "wvalid", "wready"]
    }
  },
  "signalGroupings": [
    {
      "name": "axi_write_address",
      "signals": ["awvalid", "awready", "awaddr", "awlen", "awsize"]
    }
  ],
  "parameterAnalysis": [
    {
      "name": "DATA_WIDTH",
      "defaultValue": 32,
      "dependencies": ["ADDR_WIDTH"],
      "description": "Width of data bus"
    }
  ],
  "hierarchyNotes": "Any clarifications about module instantiation or hierarchy"
}
`;

/**
 * Alignment Prompt Template
 *
 * Used by Alignment Agent to map specification requirements to RTL signals.
 *
 * Requirements: 5.1-5.5
 */
export const ALIGNMENT_PROMPT = `
You are an expert verification architect mapping specification requirements to RTL design signals.

Your task is to create a mapping between verification transactions and DUT signals.

SPECIFICATION DATA:
{specificationData}

RTL DATA:
{rtlData}

Create mappings for:

1. **Agent Mappings**: Map each protocol/interface to a verification agent
   - Determine agent type (active or passive) based on signal directions
   - Active agents have drivers (for outputs from testbench perspective)
   - Passive agents only have monitors (for inputs from testbench perspective)

2. **Signal Assignments**: Assign each signal to driver, monitor, or both

3. **Coverage Signals**: Select signals that should be sampled for functional coverage

4. **Scoreboard Pairs**: Identify input-output signal pairs for correctness checking

Respond ONLY with valid JSON in this exact format:
{
  "agentMappings": [
    {
      "agentName": "axi_master_agent",
      "agentType": "active",
      "protocol": "AXI",
      "signals": ["awvalid", "awready", "awaddr", "wdata", "wvalid", "wready"],
      "transactions": ["WriteTransaction", "ReadTransaction"]
    }
  ],
  "signalAssignments": [
    {
      "signal": "awvalid",
      "role": "driver",
      "agentName": "axi_master_agent"
    },
    {
      "signal": "awready",
      "role": "monitor",
      "agentName": "axi_master_agent"
    }
  ],
  "coverageSignals": ["awaddr", "wdata", "bresp"],
  "scoreboardPairs": [
    {
      "inputSignals": ["awaddr", "wdata"],
      "outputSignals": ["bresp"],
      "checkingStrategy": "transaction_comparison"
    }
  ]
}
`;

/**
 * Architecture Planning Prompt Template
 *
 * Used by Architecture Agent to design UVM testbench structure.
 *
 * Requirements: 6.1-6.5
 */
export const ARCHITECTURE_PLANNING_PROMPT = `
You are an expert UVM architect designing a testbench structure.

Your task is to plan the UVM testbench architecture based on alignment data.

ALIGNMENT DATA:
{alignmentData}

SPECIFICATION DATA:
{specificationData}

RTL DATA:
{rtlData}

Design the following:

1. **Environment Hierarchy**: Define the top-level environment and its components

2. **Agent Architectures**: For each agent, specify:
   - Component types needed (driver, monitor, sequencer)
   - Active vs passive configuration

3. **Virtual Interfaces**: Specify interface instantiation and config_db paths

4. **Scoreboard Design**: Define prediction and comparison strategy
   - Use "reference_model" for complex protocols (AXI, APB)
   - Use "transaction_comparison" for simple protocols (UART, I2C)

5. **Coverage Design**: Specify covergroup locations and sampling events

Respond ONLY with valid JSON in this exact format:
{
  "environmentHierarchy": {
    "topEnv": "dut_env",
    "agents": ["axi_master_agent", "apb_slave_agent"],
    "scoreboard": "dut_scoreboard",
    "coverage": ["axi_coverage", "apb_coverage"]
  },
  "agents": [
    {
      "name": "axi_master_agent",
      "type": "active",
      "components": {
        "driver": "axi_master_driver",
        "monitor": "axi_master_monitor",
        "sequencer": "axi_master_sequencer",
        "agent": "axi_master_agent"
      }
    }
  ],
  "virtualInterfaces": [
    {
      "name": "axi_if",
      "signals": ["awvalid", "awready", "awaddr"],
      "clockingBlocks": [
        {
          "name": "driver_cb",
          "clock": "clk",
          "direction": "driver",
          "skew": "#1"
        },
        {
          "name": "monitor_cb",
          "clock": "clk",
          "direction": "monitor",
          "skew": "#0"
        }
      ]
    }
  ],
  "scoreboardDesign": {
    "strategy": "reference_model",
    "inputPorts": ["axi_monitor_ap"],
    "outputPorts": ["apb_monitor_ap"],
    "comparisonLogic": "Compare AXI write data with APB read data"
  },
  "coverageDesign": {
    "covergroups": [
      {
        "name": "axi_transaction_cg",
        "location": "axi_master_monitor",
        "samplingEvent": "transaction_complete",
        "coverpoints": ["address", "data", "burst_type"]
      }
    ]
  }
}
`;

/**
 * Code Generation Prompt Template
 *
 * Used by Generator Agent to refine template-based code with protocol-specific logic.
 *
 * Requirements: 7.1-7.6
 */
export const CODE_GENERATION_PROMPT = `
You are an expert UVM verification engineer generating SystemVerilog code.

Your task is to generate or refine UVM component code based on the architecture plan.

COMPONENT TYPE: {componentType}
COMPONENT NAME: {componentName}
PROTOCOL: {protocol}
ARCHITECTURE DATA: {architectureData}

TEMPLATE CODE:
{templateCode}

Please enhance the template code with:

1. **Protocol-Specific Logic**: Add protocol-specific driving/monitoring logic
2. **Error Handling**: Add appropriate error checking and reporting
3. **Edge Cases**: Handle boundary conditions and corner cases
4. **Comments**: Add clear comments explaining the logic

For drivers:
- Implement drive_transaction() task with protocol-specific signal sequencing
- Handle backpressure and flow control
- Add timing delays appropriate for the protocol

For monitors:
- Implement signal sampling logic
- Detect transaction boundaries
- Broadcast transactions via analysis port

For sequences:
- Implement constrained-random transaction generation
- Add protocol-specific constraints

Respond with the complete, enhanced SystemVerilog code.
Include proper UVM macros, phases, and best practices.

CODE:
`;

/**
 * Sequence Generation Prompt Template
 *
 * Used by Sequence Agent to generate test sequences.
 *
 * Requirements: 8.1-8.6
 */
export const SEQUENCE_GENERATION_PROMPT = `
You are an expert UVM verification engineer creating test sequences.

Your task is to generate a UVM sequence for the following scenario.

SCENARIO: {scenarioName}
SCENARIO TYPE: {scenarioType}
DESCRIPTION: {scenarioDescription}

TRANSACTION TYPE: {transactionType}
AGENT: {agentName}
PROTOCOL: {protocol}

SPECIFICATION DATA: {specificationData}

Generate a UVM sequence that:

1. **For directed sequences**: Target the specific scenario from the specification
2. **For error sequences**: Inject protocol violations or error conditions
3. **For random sequences**: Use constrained-random generation with appropriate constraints
4. **For stress sequences**: Generate back-to-back transactions with maximum throughput

Include:
- Proper UVM sequence structure with \`uvm_object_utils macro
- Randomization constraints appropriate for the scenario
- Clear comments explaining the sequence logic
- Transaction field assignments

Respond with the complete SystemVerilog sequence code.

CODE:
`;

/**
 * Helper function to fill template with data
 */
export function fillTemplate(
  template: string,
  data: Record<string, any>,
): string {
  let filled = template;
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    const replacement =
      typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);
    filled = filled.replace(new RegExp(placeholder, "g"), replacement);
  }
  return filled;
}

/**
 * Template registry for easy access
 */
export const PROMPT_TEMPLATES = {
  specificationAnalysis: SPECIFICATION_ANALYSIS_PROMPT,
  rtlAnalysis: RTL_ANALYSIS_PROMPT,
  alignment: ALIGNMENT_PROMPT,
  architecturePlanning: ARCHITECTURE_PLANNING_PROMPT,
  codeGeneration: CODE_GENERATION_PROMPT,
  sequenceGeneration: SEQUENCE_GENERATION_PROMPT,
} as const;

export type PromptTemplateType = keyof typeof PROMPT_TEMPLATES;
