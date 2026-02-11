import express from "express";
import cors from "cors";
import { createServer } from "http";
import { env } from "./config/env";
import logger from "./config/logger";
import { dbManager } from "./config/database";
import { fileStorageService } from "./services/FileStorageService";
import { webSocketService } from "./services/WebSocketService";
import { initializeIndexes, initializeDefaults } from "./models";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket server
const io = webSocketService.initialize(httpServer);

// Middleware - Order matters!
// 1. Request logging
app.use(requestLogger);

// 2. CORS
app.use(
  cors({
    origin: env.corsOrigin,
    credentials: true,
  }),
);

// 3. Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", async (req, res) => {
  const dbHealthy = await dbManager.healthCheck();

  res.json({
    status: dbHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    version: "1.0.0",
    database: {
      connected: dbManager.isConnected(),
      healthy: dbHealthy,
    },
  });
});

// API routes
import projectRoutes from "./routes/projects";
import llmRoutes from "./routes/llm";
import testRoutes from "./routes/testRoutes";
import * as simulationController from "./controllers/simulationController";

app.get("/api", (req, res) => {
  res.json({
    message: "UVM Testbench Chatbot API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      api: "/api",
      projects: "/api/projects",
      llm: "/api/llm",
      simulators: "/api/simulators",
    },
    websocket: {
      connected: webSocketService.getTotalConnectedClients(),
      projects: webSocketService.getConnectedProjects().length,
    },
  });
});

// Mount routes
app.use("/api/projects", projectRoutes);
app.use("/api/llm", llmRoutes);
app.use("/api/test", testRoutes);

// Simulator info endpoint
app.get("/api/simulators", (req, res, next) =>
  simulationController.getAvailableSimulators(req, res, next),
);

// WebSocket connection handling is managed by WebSocketService
// No additional handlers needed here

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handling middleware - must be last
app.use(errorHandler);

const PORT = env.port;

/**
 * Initialize database and start server
 */
async function startServer() {
  try {
    // Initialize file storage
    logger.info("Initializing file storage...");
    await fileStorageService.initialize();
    logger.info("✅ File storage initialized");

    // Connect to MongoDB
    logger.info("Connecting to MongoDB...");
    await dbManager.connect();
    logger.info("✅ MongoDB connected successfully");

    // Initialize database indexes
    logger.info("Initializing database indexes...");
    await initializeIndexes();
    logger.info("✅ Database indexes created");

    // Initialize default data
    logger.info("Initializing default data...");
    await initializeDefaults();
    logger.info("✅ Default data initialized");

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${env.nodeEnv}`);
      logger.info(`🔗 CORS origin: ${env.corsOrigin}`);
      logger.info(`📊 Log level: ${env.logLevel}`);
      logger.info(
        `💾 MongoDB: ${env.mongodbUri.split("@")[1]?.split("/")[0] || "configured"}`,
      );
      logger.info(
        `🤖 OpenAI API Key: ${env.openaiApiKey ? "configured" : "missing"}`,
      );
      logger.info(`📁 File storage: ${env.uploadDir}`);
      logger.info(
        `🔌 WebSocket: ${webSocketService.getTotalConnectedClients()} clients connected`,
      );
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown() {
  logger.info("Shutting down gracefully...");

  try {
    // Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    logger.info("✅ HTTP server closed");

    // Close WebSocket server
    webSocketService.close();
    logger.info("✅ WebSocket server closed");

    // Disconnect from MongoDB
    await dbManager.disconnect();
    logger.info("✅ MongoDB disconnected");

    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Only start the server if this file is run directly (not imported for tests)
if (require.main === module) {
  startServer();
}

export { app, io, httpServer };
