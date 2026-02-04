import { ObjectId } from "mongodb";
import { FileReference } from "./file";
import { UVMTreeNode, TraceabilityMatrix, SimulationReadinessScore } from "./validation";
import { GeneratedFile } from "./generation";
export type ProjectStatus = "draft" | "generating" | "completed" | "failed";
export type GenerationMode = "mvp" | "production" | "advanced";
export interface Project {
    _id: ObjectId;
    projectId: string;
    name: string;
    description?: string;
    createdAt: Date;
    lastModified: Date;
    status: ProjectStatus;
    specificationFiles: FileReference[];
    rtlFiles: FileReference[];
    generationConfig?: {
        mode: GenerationMode;
        llmModel?: string;
    };
    currentGeneration?: {
        generationId: string;
        startedAt: Date;
        completedAt?: Date;
        status: "queued" | "in_progress" | "completed" | "failed";
        currentAgent?: string;
        progress: number;
        error?: string;
    };
    results?: {
        uvmTree: UVMTreeNode;
        traceabilityMatrix: TraceabilityMatrix;
        readinessScore: SimulationReadinessScore;
        generatedFiles: GeneratedFile[];
    };
}
export interface ProjectSummary {
    projectId: string;
    name: string;
    createdAt: Date;
    lastModified: Date;
    readinessScore?: number;
    status: ProjectStatus;
}
export interface CreateProjectRequest {
    name: string;
    description?: string;
}
export interface CreateProjectResponse {
    projectId: string;
    name: string;
    createdAt: Date;
}
export interface ListProjectsResponse {
    projects: ProjectSummary[];
}
export interface GetProjectResponse {
    project: Project;
    files: FileReference[];
    generationResults?: {
        uvmTree: UVMTreeNode;
        traceabilityMatrix: TraceabilityMatrix;
        readinessScore: SimulationReadinessScore;
        generatedFiles: GeneratedFile[];
    };
}
export interface DeleteProjectResponse {
    success: boolean;
}
//# sourceMappingURL=project.d.ts.map