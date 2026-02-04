/**
 * Project controller
 * Handles project management logic
 */

import { Request, Response, NextFunction } from "express";
import { projectModel } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";
import logger from "../config/logger";
import type {
  CreateProjectRequest,
  CreateProjectResponse,
  ListProjectsResponse,
  GetProjectResponse,
  DeleteProjectResponse,
  ProjectSummary,
} from "../../../packages/shared-types/src/index";

export class ProjectController {
  /**
   * POST /api/projects
   * Create a new project
   */
  async createProject(
    req: Request<{}, {}, CreateProjectRequest>,
    res: Response<CreateProjectResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { name, description } = req.body;

      // Validate input
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        res.status(400).json({
          error: "Project name is required",
        } as any);
        return;
      }

      if (name.length > 100) {
        res.status(400).json({
          error: "Project name must be 100 characters or less",
        } as any);
        return;
      }

      if (description && description.length > 500) {
        res.status(400).json({
          error: "Project description must be 500 characters or less",
        } as any);
        return;
      }

      // Create project in database
      const project = await projectModel.create({
        name: name.trim(),
        description: description?.trim(),
      });

      logger.info(`Project created: ${project.projectId} (${project.name})`);

      // Initialize project directory structure
      try {
        await fileStorageService.createProjectDirectories(project.projectId);
        logger.info(`Project directories initialized: ${project.projectId}`);
      } catch (error) {
        logger.error(
          `Failed to initialize project directories: ${project.projectId}`,
          error,
        );
        // Continue - directories can be created on first file upload
      }

      // Return project details
      res.status(201).json({
        projectId: project.projectId,
        name: project.name,
        createdAt: project.createdAt,
      });
    } catch (error) {
      logger.error("Error creating project:", error);
      next(error);
    }
  }

  /**
   * GET /api/projects
   * List all projects
   */
  async listProjects(
    req: Request,
    res: Response<ListProjectsResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Get all projects sorted by lastModified (newest first)
      const projects = await projectModel.findAll({
        sort: { lastModified: -1 },
      });

      // Map to project summaries
      const summaries: ProjectSummary[] = projects.map((project) => ({
        projectId: project.projectId,
        name: project.name,
        createdAt: project.createdAt,
        lastModified: project.lastModified,
        status: project.status,
        readinessScore: project.results?.readinessScore?.overall,
      }));

      logger.debug(`Listed ${summaries.length} projects`);

      res.json({
        projects: summaries,
      });
    } catch (error) {
      logger.error("Error listing projects:", error);
      next(error);
    }
  }

  /**
   * GET /api/projects/:projectId
   * Get project details
   */
  async getProject(
    req: Request<{ projectId: string }>,
    res: Response<GetProjectResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      // Find project
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Combine all files
      const files = [...project.specificationFiles, ...project.rtlFiles];

      // Build response
      const response: GetProjectResponse = {
        project: project as any,
        files,
      };

      // Include generation results if available
      if (project.results) {
        response.generationResults = {
          uvmTree: project.results.uvmTree,
          traceabilityMatrix: project.results.traceabilityMatrix,
          readinessScore: project.results.readinessScore,
          generatedFiles: project.results.generatedFiles,
        };
      }

      logger.debug(`Retrieved project: ${projectId}`);

      res.json(response);
    } catch (error) {
      logger.error("Error getting project:", error);
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:projectId
   * Delete a project
   */
  async deleteProject(
    req: Request<{ projectId: string }>,
    res: Response<DeleteProjectResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      // Check if project exists
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Delete project from database
      const deleted = await projectModel.delete(projectId);

      if (!deleted) {
        res.status(500).json({
          error: "Failed to delete project from database",
        } as any);
        return;
      }

      logger.info(`Project deleted from database: ${projectId}`);

      // Delete project files from file system
      try {
        await fileStorageService.deleteProjectFiles(projectId);
        logger.info(`Project files deleted: ${projectId}`);
      } catch (error) {
        logger.error(`Failed to delete project files: ${projectId}`, error);
        // Continue - database record is already deleted
      }

      res.json({
        success: true,
      });
    } catch (error) {
      logger.error("Error deleting project:", error);
      next(error);
    }
  }
}

// Export singleton instance
export const projectController = new ProjectController();
export default projectController;
