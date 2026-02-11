/**
 * Simulation Controller
 * Handles simulation execution and status endpoints
 */

import { Request, Response, NextFunction } from "express";
import { simulatorService } from "../services/SimulatorService";
import logger from "../config/logger";
import * as path from "path";
import * as fs from "fs/promises";

/**
 * Start a simulation
 * POST /api/projects/:projectId/simulate
 */
export const startSimulation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const {
      simulator,
      generationId,
      runtime = "1000ns",
      timescale = "1ns/1ps",
      plusargs = [],
    } = req.body;

    logger.info(`Starting simulation for project ${projectId}`);

    // Validate required fields
    if (!simulator || !generationId) {
      res.status(400).json({
        error: "Missing required fields: simulator, generationId",
      });
      return;
    }

    // Check if simulator is available
    const isAvailable = await simulatorService.isSimulatorAvailable(simulator);
    if (!isAvailable) {
      res.status(400).json({
        error: `Simulator ${simulator} is not available on this system`,
      });
      return;
    }

    // Get project directory
    const projectDir = path.join(process.cwd(), "projects", projectId);

    // Find testbench and RTL files
    const generationDir = path.join(projectDir, "generated", generationId);
    const testbenchFiles: string[] = [];
    const rtlFiles: string[] = [];

    try {
      const files = await fs.readdir(generationDir, { recursive: true });

      for (const file of files) {
        const filePath = path.join(generationDir, file as string);
        const stats = await fs.stat(filePath);

        if (stats.isFile() && (file as string).endsWith(".sv")) {
          // Classify files
          if (
            (file as string).includes("tb_") ||
            (file as string).includes("test")
          ) {
            testbenchFiles.push(filePath);
          } else {
            rtlFiles.push(filePath);
          }
        }
      }
    } catch (error) {
      logger.error("Error reading generation directory:", error);
      res.status(500).json({
        error: "Failed to read generation files",
      });
      return;
    }

    if (testbenchFiles.length === 0) {
      res.status(400).json({
        error: "No testbench files found in generation",
      });
      return;
    }

    // Check if testbench uses UVM
    let usesUVM = false;
    for (const tbFile of testbenchFiles) {
      try {
        const content = await fs.readFile(tbFile, "utf-8");
        if (
          content.includes("import uvm_pkg") ||
          content.includes("uvm_macros") ||
          content.includes("extends uvm_")
        ) {
          usesUVM = true;
          break;
        }
      } catch (error) {
        logger.warn(`Could not read file ${tbFile} for UVM detection`);
      }
    }

    // Validate simulator compatibility with UVM
    if (usesUVM) {
      const uvmCompatibleSimulators = ["modelsim", "vcs", "xcelium"];
      if (!uvmCompatibleSimulators.includes(simulator)) {
        res.status(400).json({
          error: `Simulator '${simulator}' does not support UVM. Please use one of: ${uvmCompatibleSimulators.join(", ")}`,
          details:
            "Your testbench uses UVM (Universal Verification Methodology) which requires a commercial simulator or specific UVM-compatible tools.",
          suggestions: [
            "Install ModelSim Intel FPGA Starter Edition (free)",
            "Use a commercial simulator (VCS, Xcelium, QuestaSim)",
            "Regenerate testbench without UVM methodology",
          ],
        });
        return;
      }
    }

    // Determine top module (usually tb_top or similar)
    const topModule = "tb_top"; // TODO: Make this configurable or detect from files

    // VCD output path
    const vcdOutputPath = path.join(generationDir, "simulation.vcd");

    // Build simulation configuration
    const config = {
      simulator,
      projectId,
      generationId,
      testbenchFiles,
      rtlFiles,
      topModule,
      runtime,
      timescale,
      plusargs,
      defines: {},
      vcdOutputPath,
    };

    // Start simulation asynchronously
    const jobId = generationId; // Use generationId as jobId for simplicity

    // Run simulation in background
    simulatorService
      .runSimulation(config, jobId)
      .then((result) => {
        logger.info(
          `Simulation ${jobId} completed: ${result.success ? "success" : "failed"}`,
        );
      })
      .catch((error) => {
        logger.error(`Simulation ${jobId} error:`, error);
      });

    res.status(200).json({
      message: "Simulation started",
      jobId,
    });
  } catch (error) {
    logger.error("Error starting simulation:", error);
    next(error);
  }
};

/**
 * Get simulation status
 * GET /api/projects/:projectId/simulate/:jobId/status
 */
export const getSimulationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { projectId, jobId } = req.params;

    logger.info(`Getting simulation status for job ${jobId}`);

    // Check if simulation is running
    const isRunning = simulatorService.isSimulationRunning(jobId);

    if (isRunning) {
      res.status(200).json({
        status: "running",
        progress: {
          phase: "simulating",
          percentage: 50,
          message: "Simulation in progress...",
        },
        consoleOutput: "",
        errors: [],
        warnings: [],
      });
      return;
    }

    // If not running, check if VCD file exists (simulation complete)
    const generationDir = path.join(
      process.cwd(),
      "projects",
      projectId,
      "generated",
      jobId,
    );
    const vcdPath = path.join(generationDir, "simulation.vcd");

    try {
      await fs.access(vcdPath);

      // VCD file exists, simulation is complete
      res.status(200).json({
        status: "complete",
        progress: {
          phase: "complete",
          percentage: 100,
          message: "Simulation completed successfully",
        },
        vcdFilePath: vcdPath,
        consoleOutput: "",
        errors: [],
        warnings: [],
      });
    } catch {
      // VCD file doesn't exist, simulation may have failed or not started
      res.status(200).json({
        status: "idle",
        progress: {
          phase: "compiling",
          percentage: 0,
          message: "Simulation not started",
        },
        consoleOutput: "",
        errors: [],
        warnings: [],
      });
    }
  } catch (error) {
    logger.error("Error getting simulation status:", error);
    next(error);
  }
};

/**
 * Get VCD file content
 * GET /api/projects/:projectId/simulate/:jobId/vcd
 */
export const getVCDFile = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { projectId, jobId } = req.params;

    logger.info(`Getting VCD file for job ${jobId}`);

    const generationDir = path.join(
      process.cwd(),
      "projects",
      projectId,
      "generated",
      jobId,
    );
    const vcdPath = path.join(generationDir, "simulation.vcd");

    try {
      const vcdContent = await fs.readFile(vcdPath, "utf-8");

      res.setHeader("Content-Type", "text/plain");
      res.status(200).send(vcdContent);
    } catch (error) {
      logger.error("Error reading VCD file:", error);
      res.status(404).json({
        error: "VCD file not found",
      });
    }
  } catch (error) {
    logger.error("Error getting VCD file:", error);
    next(error);
  }
};

/**
 * Cancel a running simulation
 * DELETE /api/projects/:projectId/simulate/:jobId
 */
export const cancelSimulation = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { jobId } = req.params;

    logger.info(`Canceling simulation job ${jobId}`);

    await simulatorService.cancelSimulation(jobId);

    res.status(200).json({
      message: "Simulation canceled successfully",
    });
  } catch (error) {
    logger.error("Error canceling simulation:", error);
    next(error);
  }
};

/**
 * Get available simulators
 * GET /api/simulators
 */
export const getAvailableSimulators = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    logger.info("Getting available simulators");

    const simulators = await simulatorService.getAllSimulatorInfo();

    res.status(200).json({
      simulators,
    });
  } catch (error) {
    logger.error("Error getting available simulators:", error);
    next(error);
  }
};
