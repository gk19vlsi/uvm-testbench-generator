/**
 * Generation controller
 * Handles testbench generation logic
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { projectModel } from "../models/Project";
import { generationModel } from "../models/Generation";
import { llmService } from "../services/LLMService";
import PipelineOrchestrator from "../services/PipelineOrchestrator";
import { fileStorageService } from "../services/FileStorageService";
import logger from "../config/logger";

/**
 * Generate testbench request
 */
export interface GenerateTestbenchRequest {
  mode?: "mvp" | "production" | "advanced";
  llmModel?: string;
}

/**
 * Generate testbench response
 */
export interface GenerateTestbenchResponse {
  generationId: string;
  status: "queued" | "in_progress";
  websocketUrl: string;
}

/**
 * Generation status response
 */
export interface GenerationStatusResponse {
  generationId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  currentAgent?: string;
  progress: number;
  error?: string;
}

export class GenerationController {
  /**
   * POST /api/projects/:projectId/generate
   * Trigger testbench generation
   */
  async generateTestbench(
    req: Request<{ projectId: string }, {}, GenerateTestbenchRequest>,
    res: Response<GenerateTestbenchResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { mode = "production", llmModel } = req.body;

      // Validate project exists
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Validate project has required files
      if (project.specificationFiles.length === 0) {
        res.status(400).json({
          error: "Project must have at least one specification file",
        } as any);
        return;
      }

      if (project.rtlFiles.length === 0) {
        res.status(400).json({
          error: "Project must have at least one RTL file",
        } as any);
        return;
      }

      // Create generation record in database
      const generation = await generationModel.create(projectId);
      const generationId = generation.generationId;

      logger.info(
        `Generation created: ${generationId} for project ${projectId}`,
      );

      // Update project with current generation
      await projectModel.update(projectId, {
        currentGeneration: {
          generationId,
          startedAt: new Date(),
          status: "queued",
          progress: 0,
        },
        status: "generating",
      });

      // Get LLM provider
      if (llmModel) {
        llmService.switchModel(llmModel as any);
      }
      const llmProvider = llmService.getLLM();

      // Load file contents
      const specificationFiles = await Promise.all(
        project.specificationFiles.map(async (file) => {
          const filePath =
            fileStorageService.getUploadDir(projectId, "specification") +
            "/" +
            file.filename;
          const content = await fileStorageService.readFileAsString(filePath);
          return {
            fileId: file.fileId,
            filename: file.filename,
            content,
          };
        }),
      );

      const rtlFiles = await Promise.all(
        project.rtlFiles.map(async (file) => {
          const filePath =
            fileStorageService.getUploadDir(projectId, "rtl") +
            "/" +
            file.filename;
          const content = await fileStorageService.readFileAsString(filePath);
          return {
            fileId: file.fileId,
            filename: file.filename,
            content,
          };
        }),
      );

      // Start pipeline execution asynchronously
      this.executePipelineAsync(
        projectId,
        generationId,
        specificationFiles,
        rtlFiles,
        llmProvider,
      );

      // Return generation ID and WebSocket URL
      const websocketUrl = `${process.env.WEBSOCKET_URL || "ws://localhost:4000"}?projectId=${projectId}`;

      res.status(202).json({
        generationId,
        status: "queued",
        websocketUrl,
      });
    } catch (error) {
      logger.error("Error starting generation:", error);
      next(error);
    }
  }

  /**
   * Execute pipeline asynchronously
   */
  private async executePipelineAsync(
    projectId: string,
    generationId: string,
    specificationFiles: Array<{
      fileId: string;
      filename: string;
      content: string;
    }>,
    rtlFiles: Array<{
      fileId: string;
      filename: string;
      content: string;
    }>,
    llmProvider: any,
  ): Promise<void> {
    let project: any = null;
    try {
      // Update generation status to in_progress
      await generationModel.updateStatus(generationId, "in_progress");

      // Get current project to update generation status
      project = await projectModel.findByProjectId(projectId);
      if (project?.currentGeneration) {
        await projectModel.update(projectId, {
          currentGeneration: {
            ...project.currentGeneration,
            status: "in_progress",
          },
        });
      }

      // Create pipeline orchestrator
      const orchestrator = new PipelineOrchestrator();

      // Execute pipeline
      const result = await orchestrator.execute({
        projectId,
        generationId,
        specificationFiles,
        rtlFiles,
        llmProvider,
      });

      // Update generation status
      await generationModel.updateStatus(
        generationId,
        result.status,
        new Date(),
      );

      // Update project with results - reuse project variable from above
      if (result.status === "completed") {
        await projectModel.update(projectId, {
          status: "completed",
          currentGeneration: project?.currentGeneration
            ? {
                ...project.currentGeneration,
                status: "completed",
                completedAt: new Date(),
                progress: 100,
              }
            : undefined,
          results: {
            uvmTree: this.buildUVMTree(result.outputs.generatorAgent),
            traceabilityMatrix: this.buildTraceabilityMatrix(
              result.outputs.specificationAgent,
              result.outputs.generatorAgent,
            ),
            readinessScore: result.outputs.validationAgent?.readinessScore,
            generatedFiles: [
              ...result.outputs.generatorAgent.generatedFiles,
              ...result.outputs.sequenceAgent.sequences.map((s: any) => ({
                path: s.filePath,
                content: s.code,
                type: "sequence",
              })),
              ...result.outputs.sequenceAgent.tests.map((t: any) => ({
                path: t.filePath,
                content: t.code,
                type: "test",
              })),
            ],
          },
        });

        // Save generated files to file system
        await this.saveGeneratedFiles(projectId, generationId, result.outputs);

        logger.info(`Generation completed successfully: ${generationId}`);
      } else {
        if (result.error) {
          await generationModel.setError(generationId, result.error);
        }

        await projectModel.update(projectId, {
          status: "failed",
          currentGeneration: project?.currentGeneration
            ? {
                ...project.currentGeneration,
                status: "failed",
                error: result.error?.message,
              }
            : undefined,
        });

        logger.error(`Generation failed: ${generationId}`, result.error);
      }
    } catch (error: any) {
      logger.error(`Pipeline execution error: ${generationId}`, error);

      // Update generation and project status
      await generationModel.setError(generationId, {
        agentName: "Pipeline",
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      });

      // Refetch project for catch block access
      project = await projectModel.findByProjectId(projectId);
      await projectModel.update(projectId, {
        status: "failed",
        currentGeneration: project?.currentGeneration
          ? {
              ...project.currentGeneration,
              status: "failed",
              error: error.message,
            }
          : undefined,
      });
    }
  }

  /**
   * GET /api/projects/:projectId/generation/:generationId/status
   * Get generation status
   */
  async getGenerationStatus(
    req: Request<{ projectId: string; generationId: string }>,
    res: Response<GenerationStatusResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId, generationId } = req.params;

      // Validate project exists
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Get generation record
      const generation = await generationModel.findByGenerationId(generationId);

      if (!generation) {
        res.status(404).json({
          error: "Generation not found",
        } as any);
        return;
      }

      // Get current agent from agent executions
      const currentAgent = generation.agentExecutions.find(
        (exec) => exec.status === "in_progress",
      )?.agentName;

      // Calculate progress
      const completedAgents = generation.agentExecutions.filter(
        (exec) => exec.status === "completed",
      ).length;
      const totalAgents = 7; // Total number of agents in pipeline
      const progress = Math.round((completedAgents / totalAgents) * 100);

      res.json({
        generationId: generation.generationId,
        status: generation.status,
        currentAgent,
        progress,
        error: generation.error?.message,
      });
    } catch (error) {
      logger.error("Error getting generation status:", error);
      next(error);
    }
  }

  /**
   * Build UVM tree from generator output
   */
  private buildUVMTree(generatorData: any): any {
    // TODO: Implement UVM tree building logic
    // For now, return a simple structure
    return {
      name: "testbench",
      type: "root",
      children: [],
    };
  }

  /**
   * Build traceability matrix
   */
  private buildTraceabilityMatrix(
    specificationData: any,
    generatorData: any,
  ): any {
    // TODO: Implement traceability matrix building logic
    // For now, return a simple structure
    return {
      requirements: [],
      components: [],
      mappings: [],
      coveragePercentage: 0,
    };
  }

  /**
   * Save generated files to file system
   */
  private async saveGeneratedFiles(
    projectId: string,
    generationId: string,
    outputs: any,
  ): Promise<void> {
    try {
      // Save generator files
      for (const file of outputs.generatorAgent.generatedFiles) {
        await fileStorageService.saveGeneratedFile(
          projectId,
          generationId,
          file.path,
          file.content,
        );
      }

      // Save sequence files
      for (const sequence of outputs.sequenceAgent.sequences) {
        await fileStorageService.saveGeneratedFile(
          projectId,
          generationId,
          sequence.filePath,
          sequence.code,
        );
      }

      // Save test files
      for (const test of outputs.sequenceAgent.tests) {
        await fileStorageService.saveGeneratedFile(
          projectId,
          generationId,
          test.filePath,
          test.code,
        );
      }

      logger.info(`Generated files saved for generation: ${generationId}`);
    } catch (error) {
      logger.error(`Failed to save generated files: ${generationId}`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const generationController = new GenerationController();
export default generationController;
