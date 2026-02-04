/**
 * Project routes
 * Handles project management endpoints
 */

import { Router } from "express";
import { projectController } from "../controllers/projectController";
import { fileController } from "../controllers/fileController";
import { generationController } from "../controllers/generationController";
import { resultsController } from "../controllers/resultsController";
import { upload } from "../config/multer";

const router = Router();

// Project CRUD endpoints
router.post("/", projectController.createProject);
router.get("/", projectController.listProjects);
router.get("/:projectId", projectController.getProject);
router.delete("/:projectId", projectController.deleteProject);

// File upload endpoints
router.post(
  "/:projectId/files/upload",
  upload.array("files", 10),
  fileController.uploadFiles,
);
router.delete("/:projectId/files/:fileId", fileController.deleteFile);

// Generation endpoints
router.post("/:projectId/generate", generationController.generateTestbench);
router.get(
  "/:projectId/generation/:generationId/status",
  generationController.getGenerationStatus,
);

// Results endpoints
router.get("/:projectId/results", resultsController.getResults);
router.get("/:projectId/download", resultsController.downloadTestbench);

// File content endpoints - use path parameter with wildcard
router.get("/:projectId/files/:filePath(*)", resultsController.getFileContent);
router.put(
  "/:projectId/files/:filePath(*)",
  resultsController.updateFileContent,
);

export default router;
