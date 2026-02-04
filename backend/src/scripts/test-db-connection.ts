/**
 * Test script to verify MongoDB connection and models
 */

import { dbManager } from "../config/database";
import {
  projectModel,
  generationModel,
  llmConfigurationModel,
} from "../models";
import logger from "../config/logger";
import { v4 as uuidv4 } from "uuid";

async function testDatabaseConnection() {
  try {
    logger.info("=== Testing MongoDB Connection ===");

    // Test connection
    logger.info("1. Connecting to MongoDB...");
    await dbManager.connect();
    logger.info("✅ Connected successfully");

    // Test health check
    logger.info("2. Testing health check...");
    const healthy = await dbManager.healthCheck();
    logger.info(`✅ Health check: ${healthy ? "PASS" : "FAIL"}`);

    // Test LLM Configuration model
    logger.info("3. Testing LLM Configuration model...");
    await llmConfigurationModel.createIndexes();
    await llmConfigurationModel.initializeDefaults();
    const llmConfig = await llmConfigurationModel.getCurrent();
    logger.info(`✅ LLM Config: ${JSON.stringify(llmConfig, null, 2)}`);

    // Test Project model
    logger.info("4. Testing Project model...");
    await projectModel.createIndexes();

    const testProject = await projectModel.create({
      projectId: uuidv4(),
      name: "Test Project",
      description: "A test project for database verification",
      status: "draft",
      specificationFiles: [],
      rtlFiles: [],
    });
    logger.info(`✅ Created test project: ${testProject.projectId}`);

    // Retrieve the project
    const retrievedProject = await projectModel.findByProjectId(
      testProject.projectId,
    );
    logger.info(`✅ Retrieved project: ${retrievedProject?.name}`);

    // Update the project
    await projectModel.update(testProject.projectId, {
      description: "Updated description",
    });
    logger.info("✅ Updated project");

    // Test Generation model
    logger.info("5. Testing Generation model...");
    await generationModel.createIndexes();

    const testGeneration = await generationModel.create({
      generationId: uuidv4(),
      projectId: testProject.projectId,
      status: "queued",
      agentExecutions: [],
    });
    logger.info(`✅ Created test generation: ${testGeneration.generationId}`);

    // Add agent execution
    await generationModel.addAgentExecution(testGeneration.generationId, {
      agentName: "Test Agent",
      startedAt: new Date(),
      status: "in_progress",
    });
    logger.info("✅ Added agent execution");

    // Clean up test data
    logger.info("6. Cleaning up test data...");
    await generationModel.delete(testGeneration.generationId);
    await projectModel.delete(testProject.projectId);
    logger.info("✅ Cleaned up test data");

    // Disconnect
    logger.info("7. Disconnecting...");
    await dbManager.disconnect();
    logger.info("✅ Disconnected successfully");

    logger.info("\n=== All Tests Passed! ===\n");
    process.exit(0);
  } catch (error) {
    logger.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection();
