/**
 * MongoDB connection manager with retry logic
 * Handles database connection, reconnection, and error handling
 */

import { MongoClient, Db } from "mongodb";
import { env } from "./env";
import logger from "./logger";

class DatabaseManager {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private isConnecting = false;
  private maxRetries = 5;
  private retryDelay = 5000; // 5 seconds

  /**
   * Connect to MongoDB with retry logic
   */
  async connect(): Promise<Db> {
    if (this.db) {
      return this.db;
    }

    if (this.isConnecting) {
      // Wait for existing connection attempt
      while (this.isConnecting) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (this.db) {
        return this.db;
      }
    }

    this.isConnecting = true;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(
          `Attempting to connect to MongoDB (attempt ${attempt}/${this.maxRetries})...`,
        );

        this.client = new MongoClient(env.mongodbUri, {
          maxPoolSize: 10,
          minPoolSize: 2,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          tls: true,
          tlsAllowInvalidCertificates: false,
          tlsAllowInvalidHostnames: false,
        });

        await this.client.connect();

        // Extract database name from URI or use default
        const dbName = this.extractDbName(env.mongodbUri) || "uvm-chatbot";
        this.db = this.client.db(dbName);

        // Verify connection
        await this.db.admin().ping();

        logger.info(`✅ Successfully connected to MongoDB database: ${dbName}`);

        // Set up connection event handlers
        this.setupEventHandlers();

        this.isConnecting = false;
        return this.db;
      } catch (error) {
        logger.error(
          `Failed to connect to MongoDB (attempt ${attempt}/${this.maxRetries}):`,
          error,
        );

        if (attempt < this.maxRetries) {
          logger.info(`Retrying in ${this.retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        } else {
          this.isConnecting = false;
          throw new Error(
            `Failed to connect to MongoDB after ${this.maxRetries} attempts`,
          );
        }
      }
    }

    this.isConnecting = false;
    throw new Error("Failed to connect to MongoDB");
  }

  /**
   * Extract database name from MongoDB URI
   */
  private extractDbName(uri: string): string | null {
    try {
      const match = uri.match(/\/([^/?]+)(\?|$)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Set up event handlers for connection monitoring
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on("connectionPoolCreated", () => {
      logger.debug("MongoDB connection pool created");
    });

    this.client.on("connectionPoolClosed", () => {
      logger.warn("MongoDB connection pool closed");
    });

    this.client.on("error", (error) => {
      logger.error("MongoDB client error:", error);
    });

    this.client.on("timeout", () => {
      logger.warn("MongoDB connection timeout");
    });

    this.client.on("close", () => {
      logger.warn("MongoDB connection closed");
      this.db = null;
    });
  }

  /**
   * Get database instance
   * Throws error if not connected
   */
  getDb(): Db {
    if (!this.db) {
      throw new Error(
        "Database not connected. Call connect() first or use getDbSafe().",
      );
    }
    return this.db;
  }

  /**
   * Get database instance with automatic connection
   */
  async getDbSafe(): Promise<Db> {
    if (!this.db) {
      return await this.connect();
    }
    return this.db;
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.db !== null;
  }

  /**
   * Health check - ping database
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.db) {
        return false;
      }
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error("Database health check failed:", error);
      return false;
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      logger.info("Closing MongoDB connection...");
      await this.client.close();
      this.client = null;
      this.db = null;
      logger.info("MongoDB connection closed");
    }
  }

  /**
   * Create indexes for collections
   */
  async createIndexes(): Promise<void> {
    const db = await this.getDbSafe();

    logger.info("Creating database indexes...");

    try {
      // Projects collection indexes
      await db
        .collection("projects")
        .createIndexes([
          { key: { projectId: 1 }, unique: true },
          { key: { status: 1 } },
          { key: { createdAt: -1 } },
          { key: { lastModified: -1 } },
        ]);

      // Generations collection indexes
      await db
        .collection("generations")
        .createIndexes([
          { key: { generationId: 1 }, unique: true },
          { key: { projectId: 1 } },
          { key: { status: 1 } },
          { key: { startedAt: -1 } },
        ]);

      // LLM Configuration collection indexes
      await db
        .collection("llm_configurations")
        .createIndexes([
          { key: { provider: 1 }, unique: true },
          { key: { updatedAt: -1 } },
        ]);

      logger.info("✅ Database indexes created successfully");
    } catch (error: any) {
      // Ignore index already exists errors
      if (error.code === 85 || error.codeName === "IndexOptionsConflict") {
        logger.debug("Indexes already exist, skipping creation");
      } else {
        throw error;
      }
    }
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();

// Export convenience function
export const getDb = () => dbManager.getDb();
export const getDbSafe = () => dbManager.getDbSafe();

export default dbManager;
