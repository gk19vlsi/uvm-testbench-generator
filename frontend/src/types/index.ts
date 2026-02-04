/**
 * Frontend Types
 * Re-exports shared types and defines frontend-specific types
 */

// Re-export shared types from backend
export type {
  Project,
  FileMetadata,
  CreateProjectRequest,
} from "../services/projectService";

export type {
  ProgressUpdate,
  ErrorPayload,
  CompletePayload,
  WebSocketMessage,
} from "../services/websocket";

export type { LLMConfiguration } from "../services/llmService";

// Frontend-specific types

export interface UVMTreeNode {
  id: string;
  name: string;
  type:
    | "env"
    | "agent"
    | "driver"
    | "monitor"
    | "sequencer"
    | "scoreboard"
    | "interface"
    | "sequence"
    | "test";
  children: UVMTreeNode[];
  filePath: string;
  codeSnippet?: string;
  description?: string;
}

export interface TraceabilityMatrix {
  requirements: Requirement[];
  components: UVMComponent[];
  mappings: TraceabilityMapping[];
  coveragePercentage: number;
}

export interface Requirement {
  id: string;
  text: string;
  category: string;
}

export interface UVMComponent {
  id: string;
  name: string;
  type: string;
  filePath: string;
}

export interface TraceabilityMapping {
  requirementId: string;
  componentId: string;
  covered: boolean;
  notes?: string;
}

export interface SimulationReadinessScore {
  overall: number; // 0-100
  breakdown: {
    completeness: number;
    connectivity: number;
    syntax: number;
    coverage: number;
  };
  classification: "Not Ready" | "Needs Review" | "Ready";
}

export interface GeneratedFile {
  path: string;
  content: string;
  type:
    | "interface"
    | "driver"
    | "monitor"
    | "sequencer"
    | "agent"
    | "env"
    | "scoreboard"
    | "sequence"
    | "test"
    | "top"
    | "readme";
}

export interface GenerationResults {
  uvmTree: UVMTreeNode;
  traceabilityMatrix: TraceabilityMatrix;
  readinessScore: SimulationReadinessScore;
  generatedFiles: GeneratedFile[];
}

export interface UploadProgress {
  fileId: string;
  filename: string;
  progress: number; // 0-100
  status: "uploading" | "completed" | "failed";
  error?: string;
}

export type GenerationMode = "mvp" | "production" | "advanced";

export interface GenerationConfig {
  mode: GenerationMode;
  llmModel?: string;
}
