import { ObjectId } from "mongodb";
import { GenerationMode } from "./project";

export type GenerationStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "failed";
export type AgentStatus = "queued" | "in_progress" | "completed" | "failed";

export interface GenerateTestbenchRequest {
  mode: GenerationMode;
  llmModel?: string; // "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo"
}

export interface GenerateTestbenchResponse {
  generationId: string;
  status: GenerationStatus;
  websocketUrl: string; // For progress tracking
}

export interface GenerationStatusResponse {
  generationId: string;
  status: GenerationStatus;
  currentAgent?: string;
  progress: number; // 0-100
  error?: string;
}

export interface Generation {
  _id: ObjectId;
  generationId: string; // UUID
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  status: GenerationStatus;

  // Agent execution tracking
  agentExecutions: AgentExecution[];

  // Final outputs
  outputs?: {
    specificationAgent?: any;
    rtlAgent?: any;
    alignmentAgent?: any;
    architectureAgent?: any;
    generatorAgent?: any;
    sequenceAgent?: any;
    validationAgent?: any;
  };

  // Error tracking
  error?: {
    agentName: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

export interface AgentExecution {
  agentName: string;
  startedAt: Date;
  completedAt?: Date;
  status: AgentStatus;
  executionTime?: number;
  tokensUsed?: number;
  error?: string;
}

export type GeneratedFileType =
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

export interface GeneratedFile {
  path: string;
  content: string;
  type: GeneratedFileType;
}

export interface GetFileContentResponse {
  filePath: string;
  content: string;
  language: "systemverilog" | "verilog";
}

export interface UpdateFileContentRequest {
  content: string;
}

export interface FileSyntaxError {
  line: number;
  column: number;
  message: string;
}

export interface UpdateFileContentResponse {
  success: boolean;
  syntaxErrors?: FileSyntaxError[];
}
