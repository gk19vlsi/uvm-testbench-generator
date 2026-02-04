/**
 * Database models tests
 */

import { dbManager } from "../config/database";
import {
  projectModel,
  generationModel,
  llmConfigurationModel,
} from "../models";

describe("Database Models", () => {
  beforeAll(async () => {
    await dbManager.connect();
  });

  afterAll(async () => {
    // Clean up test data
    const db = dbManager.getDb();
    await db.collection("projects").deleteMany({ name: /^Test/ });
    await db.collection("generations").deleteMany({});
    await db.collection("llm_configurations").deleteMany({});
    await dbManager.disconnect();
  });

  describe("Project Model", () => {
    it("should create a new project", async () => {
      const project = await projectModel.create({
        name: "Test Project",
        description: "Test description",
      });

      expect(project).toBeDefined();
      expect(project.projectId).toBeDefined();
      expect(project.name).toBe("Test Project");
      expect(project.status).toBe("draft");
      expect(project.specificationFiles).toEqual([]);
      expect(project.rtlFiles).toEqual([]);
    });

    it("should find project by projectId", async () => {
      const created = await projectModel.create({
        name: "Test Project 2",
      });

      const found = await projectModel.findByProjectId(created.projectId);
      expect(found).toBeDefined();
      expect(found?.projectId).toBe(created.projectId);
    });

    it("should update project", async () => {
      const project = await projectModel.create({
        name: "Test Project 3",
      });

      const updated = await projectModel.update(project.projectId, {
        description: "Updated description",
      });

      expect(updated).toBe(true);

      const found = await projectModel.findByProjectId(project.projectId);
      expect(found?.description).toBe("Updated description");
    });

    it("should add file to project", async () => {
      const project = await projectModel.create({
        name: "Test Project 4",
      });

      const file = {
        fileId: "file-1",
        filename: "spec.pdf",
        size: 1024,
        mimeType: "application/pdf",
        uploadedAt: new Date(),
        storagePath: "/path/to/file",
      };

      const added = await projectModel.addFile(
        project.projectId,
        "specification",
        file,
      );
      expect(added).toBe(true);

      const found = await projectModel.findByProjectId(project.projectId);
      expect(found?.specificationFiles).toHaveLength(1);
      expect(found?.specificationFiles[0].fileId).toBe("file-1");
    });

    it("should delete project", async () => {
      const project = await projectModel.create({
        name: "Test Project 5",
      });

      const deleted = await projectModel.delete(project.projectId);
      expect(deleted).toBe(true);

      const found = await projectModel.findByProjectId(project.projectId);
      expect(found).toBeNull();
    });
  });

  describe("Generation Model", () => {
    it("should create a new generation", async () => {
      const generation = await generationModel.create("project-123");

      expect(generation).toBeDefined();
      expect(generation.generationId).toBeDefined();
      expect(generation.projectId).toBe("project-123");
      expect(generation.status).toBe("queued");
      expect(generation.agentExecutions).toEqual([]);
    });

    it("should find generation by generationId", async () => {
      const created = await generationModel.create("project-456");

      const found = await generationModel.findByGenerationId(
        created.generationId,
      );
      expect(found).toBeDefined();
      expect(found?.generationId).toBe(created.generationId);
    });

    it("should update generation status", async () => {
      const generation = await generationModel.create("project-789");

      const updated = await generationModel.updateStatus(
        generation.generationId,
        "in_progress",
      );
      expect(updated).toBe(true);

      const found = await generationModel.findByGenerationId(
        generation.generationId,
      );
      expect(found?.status).toBe("in_progress");
    });

    it("should add agent execution", async () => {
      const generation = await generationModel.create("project-abc");

      const agentExecution = {
        agentName: "Specification Agent",
        startedAt: new Date(),
        status: "in_progress" as const,
      };

      const added = await generationModel.addAgentExecution(
        generation.generationId,
        agentExecution,
      );
      expect(added).toBe(true);

      const found = await generationModel.findByGenerationId(
        generation.generationId,
      );
      expect(found?.agentExecutions).toHaveLength(1);
      expect(found?.agentExecutions[0].agentName).toBe("Specification Agent");
    });

    it("should get generation statistics", async () => {
      const generation = await generationModel.create("project-stats");

      await generationModel.addAgentExecution(generation.generationId, {
        agentName: "Agent 1",
        startedAt: new Date(),
        completedAt: new Date(),
        status: "completed",
        executionTime: 1000,
        tokensUsed: 500,
      });

      await generationModel.addAgentExecution(generation.generationId, {
        agentName: "Agent 2",
        startedAt: new Date(),
        completedAt: new Date(),
        status: "completed",
        executionTime: 2000,
        tokensUsed: 1000,
      });

      const stats = await generationModel.getStatistics(
        generation.generationId,
      );

      expect(stats).toBeDefined();
      expect(stats?.totalAgents).toBe(2);
      expect(stats?.completedAgents).toBe(2);
      expect(stats?.totalExecutionTime).toBe(3000);
      expect(stats?.totalTokensUsed).toBe(1500);
    });
  });

  describe("LLM Configuration Model", () => {
    it("should create default configuration", async () => {
      const config = await llmConfigurationModel.initializeDefault();

      expect(config).toBeDefined();
      expect(config.provider).toBe("openai");
      expect(config.defaultModel).toBe("gpt-4");
      expect(config.models).toContain("gpt-4");
      expect(config.models).toContain("gpt-3.5-turbo");
      expect(config.models).toContain("gpt-4-turbo");
    });

    it("should find configuration by provider", async () => {
      await llmConfigurationModel.initializeDefault();

      const config = await llmConfigurationModel.findByProvider("openai");
      expect(config).toBeDefined();
      expect(config?.provider).toBe("openai");
    });

    it("should update default model", async () => {
      await llmConfigurationModel.initializeDefault();

      const updated = await llmConfigurationModel.updateDefaultModel(
        "openai",
        "gpt-3.5-turbo",
      );
      expect(updated).toBe(true);

      const config = await llmConfigurationModel.getCurrent();
      expect(config?.defaultModel).toBe("gpt-3.5-turbo");
    });

    it("should mark configuration as validated", async () => {
      await llmConfigurationModel.initializeDefault();

      const marked = await llmConfigurationModel.markValidated("openai", true);
      expect(marked).toBe(true);

      const config = await llmConfigurationModel.getCurrent();
      expect(config?.validated).toBe(true);
      expect(config?.validatedAt).toBeDefined();
    });
  });
});
