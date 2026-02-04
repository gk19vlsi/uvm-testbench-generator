export type UVMComponentType =
  | "env"
  | "agent"
  | "driver"
  | "monitor"
  | "sequencer"
  | "scoreboard"
  | "interface"
  | "sequence"
  | "test";

export type ReadinessClassification = "Not Ready" | "Needs Review" | "Ready";
export type RecommendationSeverity = "critical" | "warning" | "info";

export interface UVMTreeNode {
  id: string;
  name: string;
  type: UVMComponentType;
  children: UVMTreeNode[];
  filePath: string;
  codeSnippet?: string;
  description?: string;
}

export interface Requirement {
  id: string;
  text: string;
  category: string;
}

export interface UVMComponent {
  id: string;
  name: string;
  type: UVMComponentType;
  filePath: string;
}

export interface TraceabilityMapping {
  requirementId: string;
  componentId: string;
  covered: boolean;
  notes?: string;
}

export interface TraceabilityMatrix {
  requirements: Requirement[];
  components: UVMComponent[];
  mappings: TraceabilityMapping[];
  coveragePercentage: number;
}

export interface SimulationReadinessScore {
  overall: number; // 0-100
  breakdown: {
    completeness: number;
    connectivity: number;
    syntax: number;
    coverage: number;
  };
  classification: ReadinessClassification;
}

export interface CompletenessCheck {
  category: string;
  passed: boolean;
  details: string;
}

export interface ConnectivityCheck {
  signal: string;
  connected: boolean;
  details: string;
}

export interface SyntaxCheck {
  filePath: string;
  valid: boolean;
  errors: SyntaxError[];
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
}

export interface Recommendation {
  severity: RecommendationSeverity;
  category: string;
  message: string;
  actionable: string;
}

export interface GetResultsResponse {
  uvmTree: UVMTreeNode;
  traceabilityMatrix: TraceabilityMatrix;
  readinessScore: SimulationReadinessScore;
  generatedFiles: any[];
}
