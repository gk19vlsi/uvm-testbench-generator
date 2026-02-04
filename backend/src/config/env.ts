/**
 * Environment configuration module
 * Validates and exports environment variables with type safety
 */

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface EnvConfig {
  // Server
  port: number;
  nodeEnv: string;

  // MongoDB
  mongodbUri: string;

  // OpenAI
  openaiApiKey: string;

  // File Storage
  uploadDir: string;
  maxFileSize: number;
  maxProjectSize: number;

  // CORS
  corsOrigin: string;

  // Logging
  logLevel: string;
}

/**
 * Validates that required environment variables are set
 * @throws Error if required variables are missing
 */
function validateEnv(): void {
  const required = ["MONGODB_URI", "OPENAI_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
}

// Validate environment on module load
validateEnv();

/**
 * Typed environment configuration
 */
export const env: EnvConfig = {
  // Server
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // MongoDB
  mongodbUri: process.env.MONGODB_URI!,

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY!,

  // File Storage
  uploadDir: process.env.UPLOAD_DIR || "./projects",
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || "52428800", 10) /* 50MB */,
  maxProjectSize: parseInt(
    process.env.MAX_PROJECT_SIZE || "209715200",
    10,
  ) /* 200MB */,

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Logging
  logLevel: process.env.LOG_LEVEL || "info",
};

export default env;
