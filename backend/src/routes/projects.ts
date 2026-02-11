/**
 * Project routes
 * Handles project management endpoints
 */

import { Router } from "express";
import { projectController } from "../controllers/projectController";
import { fileController } from "../controllers/fileController";
import { generationController } from "../controllers/generationController";
import { resultsController } from "../controllers/resultsController";
import * as simulationController from "../controllers/simulationController";
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
router.post("/:projectId/generate", (req, res, next) =>
  generationController.generateTestbench(req, res, next),
);
router.get("/:projectId/generation/:generationId/status", (req, res, next) =>
  generationController.getGenerationStatus(req, res, next),
);

// Results endpoints
router.get("/:projectId/results", resultsController.getResults);
router.get("/:projectId/download", resultsController.downloadTestbench);

// Simulation endpoints
router.post("/:projectId/simulate", (req, res, next) =>
  simulationController.startSimulation(req, res, next),
);
router.get("/:projectId/simulate/:jobId/status", (req, res, next) =>
  simulationController.getSimulationStatus(req, res, next),
);
router.get("/:projectId/simulate/:jobId/vcd", (req, res, next) =>
  simulationController.getVCDFile(req, res, next),
);
router.delete("/:projectId/simulate/:jobId", (req, res, next) =>
  simulationController.cancelSimulation(req, res, next),
);

// File content endpoints - use path parameter with wildcard
router.get("/:projectId/files/:filePath(*)", resultsController.getFileContent);
router.put(
  "/:projectId/files/:filePath(*)",
  resultsController.updateFileContent,
);

export default router;
