// Agent base interfaces
export interface AgentInput {
  projectId: string;
  previousAgentOutput?: any;
  llmProvider: any; // LLMProvider type
}

export interface AgentOutput {
  success: boolean;
  data: any;
  error?: string;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
  };
}

export type ProgressCallback = (update: ProgressUpdate) => void;

export interface ProgressUpdate {
  timestamp: Date;
  agentName: string;
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
  details?: Record<string, any>;
}

// Specification Agent types
export type ProtocolName = "AXI" | "APB" | "UART" | "I2C" | "SPI" | "CUSTOM";

export interface DetectedProtocol {
  name: ProtocolName;
  confidence: number; // 0-1
  signals: string[];
  characteristics: Record<string, any>;
}

export interface TransactionField {
  name: string;
  type: string;
  width?: number;
  constraints?: string[];
}

export interface TransactionDefinition {
  name: string;
  fields: TransactionField[];
  constraints: string[];
}

export interface TimingConstraint {
  type: string;
  value: string;
  description?: string;
}

export interface CoverageGoal {
  name: string;
  description: string;
  signals: string[];
  type: "functional" | "cross";
}

export interface ErrorScenario {
  name: string;
  description: string;
  expectedResponse: string;
}

// RTL Agent types
export type PortDirection = "input" | "output" | "inout";
export type ResetPolarity = "active_high" | "active_low";

export interface PortDefinition {
  name: string;
  direction: PortDirection;
  type: string;
  width: number;
  description?: string;
}

export interface ParameterDefinition {
  name: string;
  type: string;
  defaultValue?: string;
}

export interface ModuleInstance {
  instanceName: string;
  moduleName: string;
  parameters?: Record<string, string>;
}

export interface ModuleDefinition {
  name: string;
  filePath: string;
  ports: PortDefinition[];
  parameters: ParameterDefinition[];
  instances: ModuleInstance[];
}

export interface ClockSignal {
  name: string;
  frequency?: number;
  dutyCycle?: number;
}

export interface ResetSignal {
  name: string;
  polarity: ResetPolarity;
  synchronous: boolean;
}

export interface InterfaceDefinition {
  name: string;
  signals: string[];
  modports?: string[];
}

// Alignment Agent types
export type AgentType = "active" | "passive";

export interface AgentMapping {
  agentName: string;
  agentType: AgentType;
  protocol?: string;
  signals: string[];
  transactions: string[];
}

export interface SignalAssignment {
  signal: string;
  role: "driver" | "monitor" | "both";
  agentName: string;
}

export type ScoreboardStrategy = "reference_model" | "transaction_comparison";

export interface ScoreboardPair {
  inputSignals: string[];
  outputSignals: string[];
  checkingStrategy: ScoreboardStrategy;
}

// Architecture Agent types
export interface EnvironmentHierarchy {
  topEnv: string;
  agents: string[];
  scoreboard: string;
  coverage: string[];
}

export interface AgentArchitecture {
  name: string;
  type: AgentType;
  components: {
    driver?: string;
    monitor: string;
    sequencer?: string;
    agent: string;
  };
}

export interface ClockingBlockSpec {
  name: string;
  clock: string;
  direction: "driver" | "monitor";
  skew: string;
}

export interface VirtualInterfaceSpec {
  name: string;
  signals: string[];
  clockingBlocks: ClockingBlockSpec[];
}

export interface ScoreboardDesign {
  name: string;
  strategy: ScoreboardStrategy;
  inputSignals: string[];
  outputSignals: string[];
}

export interface CoverageDesign {
  name: string;
  location: string; // Which monitor
  coverpoints: string[];
  crossCoverage?: string[][];
}

// Sequence Agent types
export type SequenceType = "base" | "directed" | "error" | "random" | "stress";
export type TestType = "smoke" | "random" | "directed" | "stress";

export interface SequenceDefinition {
  name: string;
  type: SequenceType;
  filePath: string;
  code: string;
  description: string;
}

export interface TestDefinition {
  name: string;
  type: TestType;
  sequences: string[];
  filePath: string;
  code: string;
}

// File structure
export interface FileStructure {
  directories: string[];
  files: {
    path: string;
    type: string;
    dependencies: string[];
  }[];
}
