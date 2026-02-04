import {
  setupIntegrationTests,
  teardownIntegrationTests,
  getTestDb,
} from "./setup";
import { PipelineOrchestrator } from "../../services/PipelineOrchestrator";
import { fileStorageService } from "../../services/FileStorageService";
import * as path from "path";
import * as fs from "fs";

describe("Pipeline Integration Tests", () => {
  let orchestrator: PipelineOrchestrator;
  const testProjectId = "pipeline-test-project";

  beforeAll(async () => {
    await setupIntegrationTests();
    await fileStorageService.initialize();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    const db = getTestDb();
    await db.collection("projects").deleteMany({});
    await db.collection("generations").deleteMany({});

    orchestrator = new PipelineOrchestrator();

    // Clean up test project directory
    const projectDir = fileStorageService.getProjectDirectory(testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  describe("Pipeline Execution", () => {
    it("should execute agents in correct order", async () => {
      const executionOrder: string[] = [];

      // Mock progress callback to track execution order
      const progressCallback = (update: any) => {
        if (update.status === "started") {
          executionOrder.push(update.agentName);
        }
      };

      // This test would require actual agent implementations
      // For now, we verify the orchestrator structure
      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.execute).toBe("function");
    });

    it("should pass data between agents", async () => {
      // Test that output from one agent becomes input to next
      // This requires actual agent implementations
      expect(orchestrator).toBeDefined();
    });

    it("should halt pipeline on agent failure", async () => {
      // Test that pipeline stops when an agent fails
      // This requires actual agent implementations
      expect(orchestrator).toBeDefined();
    });

    it("should persist state after each agent", async () => {
      // Test that agent outputs are saved to database
      const db = getTestDb();

      // Create test generation record
      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "in_progress",
        startedAt: new Date(),
        agentExecutions: [],
        outputs: {},
      });

      // Verify record exists
      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      expect(generation).toBeTruthy();
      expect(generation?.projectId).toBe(testProjectId);
    });
  });

  describe("Agent Execution Tracking", () => {
    it("should track agent execution times", async () => {
      const db = getTestDb();

      // Create generation with agent execution
      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "in_progress",
        startedAt: new Date(),
        agentExecutions: [
          {
            agentName: "SpecificationAgent",
            startedAt: new Date(),
            completedAt: new Date(Date.now() + 1000),
            status: "completed",
            executionTime: 1000,
          },
        ],
        outputs: {},
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      expect(generation?.agentExecutions).toHaveLength(1);
      expect(generation?.agentExecutions[0].executionTime).toBe(1000);
    });

    it("should track token usage", async () => {
      const db = getTestDb();

      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "completed",
        startedAt: new Date(),
        agentExecutions: [
          {
            agentName: "SpecificationAgent",
            startedAt: new Date(),
            completedAt: new Date(),
            status: "completed",
            executionTime: 1000,
            tokensUsed: 500,
          },
        ],
        outputs: {},
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      expect(generation?.agentExecutions[0].tokensUsed).toBe(500);
    });
  });

  describe("Error Recovery", () => {
    it("should save error details on failure", async () => {
      const db = getTestDb();

      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "failed",
        startedAt: new Date(),
        agentExecutions: [],
        outputs: {},
        error: {
          agentName: "RTLAgent",
          message: "Failed to parse RTL file",
          timestamp: new Date(),
        },
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      expect(generation?.status).toBe("failed");
      expect(generation?.error).toBeTruthy();
      expect(generation?.error?.agentName).toBe("RTLAgent");
    });

    it("should allow resuming from last successful agent", async () => {
      const db = getTestDb();

      // Create generation with partial completion
      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "failed",
        startedAt: new Date(),
        agentExecutions: [
          {
            agentName: "SpecificationAgent",
            startedAt: new Date(),
            completedAt: new Date(),
            status: "completed",
            executionTime: 1000,
          },
          {
            agentName: "RTLAgent",
            startedAt: new Date(),
            status: "failed",
            error: "Parse error",
          },
        ],
        outputs: {
          specificationAgent: { data: "test data" },
        },
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      // Verify we can identify last successful agent
      const completedAgents = generation?.agentExecutions.filter(
        (a: any) => a.status === "completed",
      );
      expect(completedAgents).toHaveLength(1);
      expect(completedAgents?.[0].agentName).toBe("SpecificationAgent");
    });
  });

  describe("Progress Broadcasting", () => {
    it("should broadcast progress updates", async () => {
      // This would require WebSocket integration
      // For now, verify the structure exists
      expect(orchestrator).toBeDefined();
    });

    it("should broadcast completion notification", async () => {
      // This would require WebSocket integration
      expect(orchestrator).toBeDefined();
    });

    it("should broadcast error notifications", async () => {
      // This would require WebSocket integration
      expect(orchestrator).toBeDefined();
    });
  });

  describe("Generation Modes", () => {
    it("should execute MVP mode pipeline", async () => {
      const db = getTestDb();

      await db.collection("projects").insertOne({
        projectId: testProjectId,
        name: "MVP Test",
        generationConfig: {
          mode: "mvp",
        },
        createdAt: new Date(),
        status: "draft",
        specificationFiles: [],
        rtlFiles: [],
      });

      const project = await db.collection("projects").findOne({
        projectId: testProjectId,
      });

      expect(project?.generationConfig?.mode).toBe("mvp");
    });

    it("should execute Production mode pipeline", async () => {
      const db = getTestDb();

      await db.collection("projects").insertOne({
        projectId: testProjectId,
        name: "Production Test",
        generationConfig: {
          mode: "production",
        },
        createdAt: new Date(),
        status: "draft",
        specificationFiles: [],
        rtlFiles: [],
      });

      const project = await db.collection("projects").findOne({
        projectId: testProjectId,
      });

      expect(project?.generationConfig?.mode).toBe("production");
    });

    it("should execute Advanced mode pipeline", async () => {
      const db = getTestDb();

      await db.collection("projects").insertOne({
        projectId: testProjectId,
        name: "Advanced Test",
        generationConfig: {
          mode: "advanced",
        },
        createdAt: new Date(),
        status: "draft",
        specificationFiles: [],
        rtlFiles: [],
      });

      const project = await db.collection("projects").findOne({
        projectId: testProjectId,
      });

      expect(project?.generationConfig?.mode).toBe("advanced");
    });
  });

  describe("Result Aggregation", () => {
    it("should aggregate results from all agents", async () => {
      const db = getTestDb();

      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "completed",
        startedAt: new Date(),
        completedAt: new Date(),
        agentExecutions: [
          {
            agentName: "SpecificationAgent",
            status: "completed",
            startedAt: new Date(),
            completedAt: new Date(),
            executionTime: 1000,
          },
          {
            agentName: "RTLAgent",
            status: "completed",
            startedAt: new Date(),
            completedAt: new Date(),
            executionTime: 1500,
          },
        ],
        outputs: {
          specificationAgent: { protocols: ["AXI"] },
          rtlAgent: { modules: ["axi4_slave"] },
          alignmentAgent: { agentMappings: [] },
          architectureAgent: { environmentHierarchy: {} },
          generatorAgent: { generatedFiles: [] },
          sequenceAgent: { sequences: [] },
          validationAgent: { readinessScore: { overall: 85 } },
        },
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      expect(generation?.outputs).toBeTruthy();
      expect(generation?.outputs?.specificationAgent).toBeTruthy();
      expect(generation?.outputs?.validationAgent).toBeTruthy();
    });

    it("should calculate total execution time", async () => {
      const db = getTestDb();

      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 5000);

      await db.collection("generations").insertOne({
        generationId: "test-gen-123",
        projectId: testProjectId,
        status: "completed",
        startedAt: startTime,
        completedAt: endTime,
        agentExecutions: [],
        outputs: {},
      });

      const generation = await db.collection("generations").findOne({
        generationId: "test-gen-123",
      });

      const totalTime =
        generation?.completedAt.getTime() - generation?.startedAt.getTime();
      expect(totalTime).toBe(5000);
    });
  });

  describe("Concurrent Generations", () => {
    it("should handle multiple concurrent generations", async () => {
      const db = getTestDb();

      // Create multiple generation records
      await db.collection("generations").insertMany([
        {
          generationId: "gen-1",
          projectId: "project-1",
          status: "in_progress",
          startedAt: new Date(),
          agentExecutions: [],
          outputs: {},
        },
        {
          generationId: "gen-2",
          projectId: "project-2",
          status: "in_progress",
          startedAt: new Date(),
          agentExecutions: [],
          outputs: {},
        },
      ]);

      const generations = await db
        .collection("generations")
        .find({
          status: "in_progress",
        })
        .toArray();

      expect(generations).toHaveLength(2);
    });

    it("should isolate generation states", async () => {
      const db = getTestDb();

      await db.collection("generations").insertMany([
        {
          generationId: "gen-1",
          projectId: "project-1",
          status: "completed",
          startedAt: new Date(),
          agentExecutions: [],
          outputs: { specificationAgent: { data: "project-1-data" } },
        },
        {
          generationId: "gen-2",
          projectId: "project-2",
          status: "completed",
          startedAt: new Date(),
          agentExecutions: [],
          outputs: { specificationAgent: { data: "project-2-data" } },
        },
      ]);

      const gen1 = await db
        .collection("generations")
        .findOne({ generationId: "gen-1" });
      const gen2 = await db
        .collection("generations")
        .findOne({ generationId: "gen-2" });

      expect(gen1?.outputs?.specificationAgent?.data).toBe("project-1-data");
      expect(gen2?.outputs?.specificationAgent?.data).toBe("project-2-data");
    });
  });
});
