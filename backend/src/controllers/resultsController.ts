/**
 * Results controller
 * Handles results retrieval, file content, and download operations
 */

import { Request, Response, NextFunction } from "express";
import { projectModel } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";
import logger from "../config/logger";
import archiver from "archiver";
import path from "path";
import type {
  GetResultsResponse,
  GetFileContentResponse,
  UpdateFileContentRequest,
  UpdateFileContentResponse,
} from "@uvm-chatbot/shared-types";

export class ResultsController {
  /**
   * GET /api/projects/:projectId/results
   * Fetch generation results
   */
  async getResults(
    req: Request<{ projectId: string }>,
    res: Response<GetResultsResponse>,
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

      // Check if generation results exist
      if (!project.results) {
        res.status(404).json({
          error: "No generation results found for this project",
        } as any);
        return;
      }

      // Return results
      res.json({
        uvmTree: project.results.uvmTree,
        traceabilityMatrix: project.results.traceabilityMatrix,
        readinessScore: project.results.readinessScore,
        generatedFiles: project.results.generatedFiles,
      });

      logger.debug(`Retrieved results for project: ${projectId}`);
    } catch (error) {
      logger.error("Error getting results:", error);
      next(error);
    }
  }

  /**
   * GET /api/projects/:projectId/download
   * Download complete testbench as ZIP
   */
  async downloadTestbench(
    req: Request<{ projectId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;

      // Find project
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        });
        return;
      }

      // Check if generation results exist
      if (!project.results || !project.currentGeneration) {
        res.status(404).json({
          error: "No generation results found for this project",
        });
        return;
      }

      // Get generated files directory
      const generationId = project.currentGeneration.generationId;
      const generatedDir = fileStorageService.getGeneratedDir(
        projectId,
        generationId,
      );

      // Check if directory exists
      const dirExists = await fileStorageService.fileExists(generatedDir);
      if (!dirExists) {
        res.status(404).json({
          error: "Generated files not found",
        });
        return;
      }

      // Create ZIP filename with project name and timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const zipFilename = `${project.name.replace(/[^a-zA-Z0-9]/g, "_")}_${timestamp}.zip`;

      // Set response headers
      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${zipFilename}"`,
      );

      // Create ZIP archive
      const archive = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // Handle archive errors
      archive.on("error", (err) => {
        logger.error("Archive error:", err);
        throw err;
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add generated files directory to archive
      archive.directory(generatedDir, false);

      // Finalize archive
      await archive.finalize();

      logger.info(`Downloaded testbench for project: ${projectId}`);
    } catch (error) {
      logger.error("Error downloading testbench:", error);
      next(error);
    }
  }

  /**
   * GET /api/projects/:projectId/files/:filePath
   * Get file content for editing
   */
  async getFileContent(
    req: Request<{ projectId: string; filePath: string }>,
    res: Response<GetFileContentResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      // Decode the file path from URL encoding
      const filePath = decodeURIComponent(req.params.filePath);

      // Find project
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Check if generation results exist
      if (!project.currentGeneration) {
        res.status(404).json({
          error: "No generation found for this project",
        } as any);
        return;
      }

      // Get generated files directory
      const generationId = project.currentGeneration.generationId;
      const generatedDir = fileStorageService.getGeneratedDir(
        projectId,
        generationId,
      );

      // Construct full file path
      const fullFilePath = path.join(generatedDir, filePath);

      // Security check: ensure file is within generated directory
      const normalizedPath = path.normalize(fullFilePath);
      const normalizedGenDir = path.normalize(generatedDir);
      if (!normalizedPath.startsWith(normalizedGenDir)) {
        res.status(403).json({
          error: "Access denied: Invalid file path",
        } as any);
        return;
      }

      // Check if file exists
      const fileExists = await fileStorageService.fileExists(fullFilePath);
      if (!fileExists) {
        res.status(404).json({
          error: "File not found",
        } as any);
        return;
      }

      // Read file content
      const content = await fileStorageService.readFileAsString(fullFilePath);

      // Determine language from file extension
      const ext = path.extname(filePath).toLowerCase();
      const language = ext === ".v" ? "verilog" : "systemverilog";

      res.json({
        filePath,
        content,
        language,
      });

      logger.debug(
        `Retrieved file content: ${filePath} for project: ${projectId}`,
      );
    } catch (error) {
      logger.error("Error getting file content:", error);
      next(error);
    }
  }

  /**
   * PUT /api/projects/:projectId/files/:filePath
   * Update file content
   */
  async updateFileContent(
    req: Request<
      { projectId: string; filePath: string },
      {},
      UpdateFileContentRequest
    >,
    res: Response<UpdateFileContentResponse>,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      // Decode the file path from URL encoding
      const filePath = decodeURIComponent(req.params.filePath);
      const { content } = req.body;

      // Validate input
      if (typeof content !== "string") {
        res.status(400).json({
          error: "Content must be a string",
        } as any);
        return;
      }

      // Find project
      const project = await projectModel.findByProjectId(projectId);

      if (!project) {
        res.status(404).json({
          error: "Project not found",
        } as any);
        return;
      }

      // Check if generation results exist
      if (!project.currentGeneration) {
        res.status(404).json({
          error: "No generation found for this project",
        } as any);
        return;
      }

      // Get generated files directory
      const generationId = project.currentGeneration.generationId;
      const generatedDir = fileStorageService.getGeneratedDir(
        projectId,
        generationId,
      );

      // Construct full file path
      const fullFilePath = path.join(generatedDir, filePath);

      // Security check: ensure file is within generated directory
      const normalizedPath = path.normalize(fullFilePath);
      const normalizedGenDir = path.normalize(generatedDir);
      if (!normalizedPath.startsWith(normalizedGenDir)) {
        res.status(403).json({
          error: "Access denied: Invalid file path",
        } as any);
        return;
      }

      // Save updated content
      const result = await fileStorageService.saveGeneratedFile(
        projectId,
        generationId,
        filePath,
        content,
      );

      if (!result.success) {
        res.status(500).json({
          error: `Failed to save file: ${result.error}`,
        } as any);
        return;
      }

      // Perform basic syntax validation
      const syntaxErrors = this.validateSyntax(content, filePath);

      // Update project's lastModified timestamp
      await projectModel.update(projectId, {
        lastModified: new Date(),
      });

      res.json({
        success: true,
        syntaxErrors: syntaxErrors.length > 0 ? syntaxErrors : undefined,
      });

      logger.info(
        `Updated file content: ${filePath} for project: ${projectId}`,
      );
    } catch (error) {
      logger.error("Error updating file content:", error);
      next(error);
    }
  }

  /**
   * Basic syntax validation for SystemVerilog/Verilog
   * Returns array of syntax errors
   */
  private validateSyntax(
    content: string,
    filePath: string,
  ): Array<{ line: number; column: number; message: string }> {
    const errors: Array<{ line: number; column: number; message: string }> = [];

    // Split content into lines
    const lines = content.split("\n");

    // Basic validation rules
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for unmatched parentheses, brackets, braces
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      if (openParens !== closeParens) {
        errors.push({
          line: lineNum,
          column: 0,
          message: "Unmatched parentheses",
        });
      }

      if (openBrackets !== closeBrackets) {
        errors.push({
          line: lineNum,
          column: 0,
          message: "Unmatched brackets",
        });
      }

      if (openBraces !== closeBraces) {
        errors.push({
          line: lineNum,
          column: 0,
          message: "Unmatched braces",
        });
      }

      // Check for missing semicolons (basic check)
      const trimmed = line.trim();
      if (
        trimmed.length > 0 &&
        !trimmed.startsWith("//") &&
        !trimmed.startsWith("/*") &&
        !trimmed.endsWith(";") &&
        !trimmed.endsWith("{") &&
        !trimmed.endsWith("}") &&
        !trimmed.endsWith(":") &&
        !trimmed.includes("begin") &&
        !trimmed.includes("end") &&
        !trimmed.includes("module") &&
        !trimmed.includes("endmodule") &&
        !trimmed.includes("class") &&
        !trimmed.includes("endclass") &&
        !trimmed.includes("function") &&
        !trimmed.includes("endfunction") &&
        !trimmed.includes("task") &&
        !trimmed.includes("endtask") &&
        !trimmed.includes("if") &&
        !trimmed.includes("else") &&
        !trimmed.includes("for") &&
        !trimmed.includes("while") &&
        !trimmed.includes("case") &&
        !trimmed.includes("endcase")
      ) {
        // This is a very basic check and may have false positives
        // In production, use a proper SystemVerilog parser
      }
    }

    return errors;
  }
}

// Export singleton instance
export const resultsController = new ResultsController();
export default resultsController;
