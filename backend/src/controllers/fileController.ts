/**
 * File controller
 * Handles file upload and management
 */

import { Request, Response, NextFunction } from "express";
import { projectModel, FileReference } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";
import logger from "../config/logger";
import { v4 as uuidv4 } from "uuid";
import {
  validateFileType,
  sanitizeFilename,
  getMimeType,
} from "../config/multer";

export class FileController {
  /**
   * POST /api/projects/:projectId/files/upload
   * Upload files to a project
   */
  async uploadFiles(
    req: Request<{ projectId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId } = req.params;
      const { fileType } = req.body; // "specification" or "rtl"

      // Validate fileType
      if (!fileType || !["specification", "rtl"].includes(fileType)) {
        res.status(400).json({
          error: 'Invalid fileType. Must be "specification" or "rtl"',
        });
        return;
      }

      // Check if project exists
      const project = await projectModel.findByProjectId(projectId);
      if (!project) {
        res.status(404).json({
          error: "Project not found",
        });
        return;
      }

      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          error: "No files uploaded",
        });
        return;
      }

      const files = req.files as Express.Multer.File[];
      const uploadedFiles: FileReference[] = [];
      const errors: string[] = [];

      // Process each file
      for (const file of files) {
        try {
          // Validate file type
          if (!validateFileType(file.originalname, fileType)) {
            errors.push(
              `Invalid file type for ${file.originalname}. Expected ${fileType} file.`,
            );
            continue;
          }

          // Sanitize filename
          const sanitizedFilename = sanitizeFilename(file.originalname);

          // Generate unique file ID
          const fileId = uuidv4();

          // Save file to storage
          const result = await fileStorageService.saveFile(
            projectId,
            fileType,
            sanitizedFilename,
            file.buffer,
          );

          if (!result.success) {
            errors.push(
              `Failed to save ${file.originalname}: ${result.error}`,
            );
            continue;
          }

          // Create file reference
          const fileRef: FileReference = {
            fileId,
            filename: sanitizedFilename,
            size: file.size,
            mimeType: getMimeType(sanitizedFilename),
            uploadedAt: new Date(),
            storagePath: result.path!,
          };

          // Add file reference to project
          const added = await projectModel.addFile(
            projectId,
            fileType,
            fileRef,
          );

          if (!added) {
            errors.push(
              `Failed to add ${file.originalname} to project metadata`,
            );
            // Clean up file
            await fileStorageService.deleteFile(result.path!);
            continue;
          }

          uploadedFiles.push(fileRef);
          logger.info(
            `File uploaded: ${sanitizedFilename} to project ${projectId}`,
          );
        } catch (error: any) {
          logger.error(`Error processing file ${file.originalname}:`, error);
          errors.push(
            `Error processing ${file.originalname}: ${error.message}`,
          );
        }
      }

      // Return response
      if (uploadedFiles.length === 0) {
        res.status(400).json({
          error: "No files were successfully uploaded",
          details: errors,
        });
        return;
      }

      res.status(201).json({
        message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
        files: uploadedFiles.map((f) => ({
          fileId: f.fileId,
          filename: f.filename,
          size: f.size,
          uploadedAt: f.uploadedAt,
        })),
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      logger.error("Error uploading files:", error);
      next(error);
    }
  }

  /**
   * DELETE /api/projects/:projectId/files/:fileId
   * Delete a file from a project
   */
  async deleteFile(
    req: Request<{ projectId: string; fileId: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { projectId, fileId } = req.params;

      // Check if project exists
      const project = await projectModel.findByProjectId(projectId);
      if (!project) {
        res.status(404).json({
          error: "Project not found",
        });
        return;
      }

      // Find file in project
      let fileRef: FileReference | undefined;
      let fileType: "specification" | "rtl" | undefined;

      fileRef = project.specificationFiles.find((f) => f.fileId === fileId);
      if (fileRef) {
        fileType = "specification";
      } else {
        fileRef = project.rtlFiles.find((f) => f.fileId === fileId);
        if (fileRef) {
          fileType = "rtl";
        }
      }

      if (!fileRef || !fileType) {
        res.status(404).json({
          error: "File not found",
        });
        return;
      }

      // Delete file from storage
      try {
        await fileStorageService.deleteFile(fileRef.storagePath);
        logger.info(`File deleted from storage: ${fileRef.storagePath}`);
      } catch (error) {
        logger.error(
          `Failed to delete file from storage: ${fileRef.storagePath}`,
          error,
        );
        // Continue - remove from database anyway
      }

      // Remove file reference from project
      const removed = await projectModel.removeFile(
        projectId,
        fileType,
        fileId,
      );

      if (!removed) {
        res.status(500).json({
          error: "Failed to remove file from project",
        });
        return;
      }

      logger.info(`File removed from project: ${fileId}`);

      res.json({
        success: true,
        message: "File deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting file:", error);
      next(error);
    }
  }
}

// Export singleton instance
export const fileController = new FileController();
export default fileController;
