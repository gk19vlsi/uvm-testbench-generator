/**
 * Models index
 * Exports all database models
 */

export * from "./Project";
export * from "./Generation";
export * from "./LLMConfiguration";

export { projectModel } from "./Project";
export { generationModel } from "./Generation";
export { llmConfigurationModel } from "./LLMConfiguration";

import { dbManager } from "../config/database";
import { llmConfigurationModel } from "./LLMConfiguration";
import logger from "../config/logger";

/**
 * Initialize database indexes for all collections
 */
export async function initializeIndexes(): Promise<void> {
  await dbManager.createIndexes();
}

/**
 * Initialize default data
 */
export async function initializeDefaults(): Promise<void> {
  // Initialize default LLM configuration
  const llmConfig = await llmConfigurationModel.getCurrent();
  if (!llmConfig) {
    logger.info("Creating default LLM configuration...");
    await llmConfigurationModel.initializeDefault();
    logger.info("✅ Default LLM configuration created");
  }
}
