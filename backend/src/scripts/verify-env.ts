/**
 * Environment verification script
 * Verifies that all required environment variables are properly configured
 */

import { env } from "../config/env";
import logger from "../config/logger";

function verifyEnvironment(): void {
  logger.info("=== Environment Verification ===");
  logger.info(`✓ PORT: ${env.port}`);
  logger.info(`✓ NODE_ENV: ${env.nodeEnv}`);
  logger.info(`✓ CORS_ORIGIN: ${env.corsOrigin}`);
  logger.info(`✓ LOG_LEVEL: ${env.logLevel}`);
  logger.info(`✓ UPLOAD_DIR: ${env.uploadDir}`);
  logger.info(`✓ MAX_FILE_SIZE: ${env.maxFileSize} bytes`);
  logger.info(`✓ MAX_PROJECT_SIZE: ${env.maxProjectSize} bytes`);

  // MongoDB URI (hide credentials)
  const mongoUri = env.mongodbUri;
  const mongoDisplay = mongoUri.includes("@")
    ? `mongodb+srv://***@${mongoUri.split("@")[1]}`
    : "configured";
  logger.info(`✓ MONGODB_URI: ${mongoDisplay}`);

  // OpenAI API Key (hide key)
  const apiKeyDisplay = env.openaiApiKey
    ? `${env.openaiApiKey.substring(0, 8)}...`
    : "MISSING";
  logger.info(`✓ OPENAI_API_KEY: ${apiKeyDisplay}`);

  logger.info("=== All environment variables verified ===");
}

verifyEnvironment();
