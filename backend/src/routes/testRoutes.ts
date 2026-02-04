import { Router } from "express";
import { getDbSafe } from "../config/database";
import logger from "../config/logger";
import * as fs from "fs";
import * as path from "path";

const router = Router();

/**
 * Test-only routes for E2E testing
 * These routes should only be available in test environment
 */

// Middleware to ensure test environment
const testOnlyMiddleware = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV !== "test") {
    return res
      .status(403)
      .json({ error: "Test routes only available in test environment" });
  }
  next();
};

router.use(testOnlyMiddleware);

/**
 * POST /api/test/cleanup
 * Clean up test database and file storage
 */
router.post("/cleanup", async (req, res) => {
  try {
    const db = await getDbSafe();

    // Delete all test projects
    await db.collection("projects").deleteMany({});

    // Delete all test generations
    await db.collection("generations").deleteMany({});

    // Delete all test LLM configurations
    await db.collection("llm_configurations").deleteMany({});

    // Clean up test file storage
    const projectsDir = path.join(process.cwd(), "projects");
    if (fs.existsSync(projectsDir)) {
      const entries = fs.readdirSync(projectsDir);
      for (const entry of entries) {
        const entryPath = path.join(projectsDir, entry);
        if (fs.statSync(entryPath).isDirectory()) {
          fs.rmSync(entryPath, { recursive: true, force: true });
        }
      }
    }

    logger.info("Test database and file storage cleaned up");

    res.json({ success: true, message: "Test environment cleaned up" });
  } catch (error) {
    logger.error("Error cleaning up test environment:", error);
    res.status(500).json({ error: "Failed to clean up test environment" });
  }
});

/**
 * POST /api/test/seed
 * Seed test database with sample data
 */
router.post("/seed", async (req, res) => {
  try {
    const db = await getDbSafe();
    const { projects = [], generations = [] } = req.body;

    // Insert test projects
    if (projects.length > 0) {
      await db.collection("projects").insertMany(projects);
    }

    // Insert test generations
    if (generations.length > 0) {
      await db.collection("generations").insertMany(generations);
    }

    logger.info("Test database seeded");

    res.json({ success: true, message: "Test database seeded" });
  } catch (error) {
    logger.error("Error seeding test database:", error);
    res.status(500).json({ error: "Failed to seed test database" });
  }
});

/**
 * GET /api/test/health
 * Health check for test environment
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
