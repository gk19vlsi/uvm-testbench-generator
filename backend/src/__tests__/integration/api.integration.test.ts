import request from "supertest";
import { app } from "../../index";
import {
  setupIntegrationTests,
  teardownIntegrationTests,
  getTestDb,
} from "./setup";
import * as path from "path";
import * as fs from "fs";

describe("API Integration Tests", () => {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    const db = getTestDb();
    await db.collection("projects").deleteMany({});
    await db.collection("generations").deleteMany({});
  });

  describe("Project Management API", () => {
    describe("POST /api/projects", () => {
      it("should create a new project", async () => {
        const response = await request(app)
          .post("/api/projects")
          .send({
            name: "Test Project",
            description: "Test Description",
          })
          .expect(200);

        expect(response.body).toHaveProperty("projectId");
        expect(response.body.name).toBe("Test Project");
        expect(response.body).toHaveProperty("createdAt");
      });

      it("should reject project without name", async () => {
        const response = await request(app)
          .post("/api/projects")
          .send({
            description: "Test Description",
          })
          .expect(400);

        expect(response.body).toHaveProperty("error");
      });

      it("should create project with only name", async () => {
        const response = await request(app)
          .post("/api/projects")
          .send({
            name: "Minimal Project",
          })
          .expect(200);

        expect(response.body.name).toBe("Minimal Project");
        expect(response.body.description).toBeUndefined();
      });
    });

    describe("GET /api/projects", () => {
      it("should return empty array when no projects exist", async () => {
        const response = await request(app).get("/api/projects").expect(200);

        expect(response.body.projects).toEqual([]);
      });

      it("should return all projects", async () => {
        // Create test projects
        await request(app).post("/api/projects").send({ name: "Project 1" });
        await request(app).post("/api/projects").send({ name: "Project 2" });

        const response = await request(app).get("/api/projects").expect(200);

        expect(response.body.projects).toHaveLength(2);
        expect(response.body.projects[0]).toHaveProperty("projectId");
        expect(response.body.projects[0]).toHaveProperty("name");
      });
    });

    describe("GET /api/projects/:projectId", () => {
      it("should return project details", async () => {
        // Create project
        const createResponse = await request(app)
          .post("/api/projects")
          .send({ name: "Test Project" });

        const projectId = createResponse.body.projectId;

        // Get project details
        const response = await request(app)
          .get(`/api/projects/${projectId}`)
          .expect(200);

        expect(response.body.project.projectId).toBe(projectId);
        expect(response.body.project.name).toBe("Test Project");
        expect(response.body).toHaveProperty("files");
      });

      it("should return 404 for non-existent project", async () => {
        const response = await request(app)
          .get("/api/projects/non-existent-id")
          .expect(404);

        expect(response.body).toHaveProperty("error");
      });
    });

    describe("DELETE /api/projects/:projectId", () => {
      it("should delete project", async () => {
        // Create project
        const createResponse = await request(app)
          .post("/api/projects")
          .send({ name: "Project to Delete" });

        const projectId = createResponse.body.projectId;

        // Delete project
        await request(app).delete(`/api/projects/${projectId}`).expect(200);

        // Verify project is deleted
        await request(app).get(`/api/projects/${projectId}`).expect(404);
      });

      it("should return 404 when deleting non-existent project", async () => {
        await request(app).delete("/api/projects/non-existent-id").expect(404);
      });
    });
  });

  describe("File Upload API", () => {
    let projectId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({ name: "File Upload Test Project" });
      projectId = response.body.projectId;
    });

    describe("POST /api/projects/:projectId/files/upload", () => {
      it("should upload specification file", async () => {
        const testFilePath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-spec.md",
        );

        const response = await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "specification")
          .attach("files", testFilePath)
          .expect(200);

        expect(response.body.uploadedFiles).toHaveLength(1);
        expect(response.body.uploadedFiles[0].filename).toBe("sample-spec.md");
      });

      it("should upload RTL file", async () => {
        const testFilePath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-rtl.sv",
        );

        const response = await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "rtl")
          .attach("files", testFilePath)
          .expect(200);

        expect(response.body.uploadedFiles).toHaveLength(1);
        expect(response.body.uploadedFiles[0].filename).toBe("sample-rtl.sv");
      });

      it("should reject invalid file type", async () => {
        const testFilePath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-spec.md",
        );

        const response = await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "invalid")
          .attach("files", testFilePath)
          .expect(400);

        expect(response.body).toHaveProperty("error");
      });

      it("should upload multiple files", async () => {
        const specPath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-spec.md",
        );
        const rtlPath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-rtl.sv",
        );

        // Upload spec
        await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "specification")
          .attach("files", specPath)
          .expect(200);

        // Upload RTL
        await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "rtl")
          .attach("files", rtlPath)
          .expect(200);

        // Verify both files are in project
        const projectResponse = await request(app)
          .get(`/api/projects/${projectId}`)
          .expect(200);

        expect(projectResponse.body.files.length).toBeGreaterThanOrEqual(2);
      });
    });

    describe("DELETE /api/projects/:projectId/files/:fileId", () => {
      it("should delete uploaded file", async () => {
        // Upload file
        const testFilePath = path.join(
          __dirname,
          "../../../e2e/fixtures/sample-spec.md",
        );
        const uploadResponse = await request(app)
          .post(`/api/projects/${projectId}/files/upload`)
          .field("fileType", "specification")
          .attach("files", testFilePath);

        const fileId = uploadResponse.body.uploadedFiles[0].fileId;

        // Delete file
        await request(app)
          .delete(`/api/projects/${projectId}/files/${fileId}`)
          .expect(200);

        // Verify file is deleted
        const projectResponse = await request(app).get(
          `/api/projects/${projectId}`,
        );

        const fileExists = projectResponse.body.files.some(
          (f: any) => f.fileId === fileId,
        );
        expect(fileExists).toBe(false);
      });
    });
  });

  describe("LLM Configuration API", () => {
    describe("GET /api/llm/config", () => {
      it("should return LLM configuration", async () => {
        const response = await request(app).get("/api/llm/config").expect(200);

        expect(response.body).toHaveProperty("provider");
        expect(response.body).toHaveProperty("models");
      });
    });

    describe("POST /api/llm/config", () => {
      it("should update LLM configuration", async () => {
        const response = await request(app)
          .post("/api/llm/config")
          .send({
            provider: "openai",
            model: "gpt-4",
          })
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it("should validate API key", async () => {
        // This test depends on OPENAI_API_KEY being set
        if (!process.env.OPENAI_API_KEY) {
          return;
        }

        const response = await request(app)
          .post("/api/llm/config")
          .send({
            provider: "openai",
            model: "gpt-3.5-turbo",
          })
          .expect(200);

        expect(response.body).toHaveProperty("validated");
      });
    });
  });

  describe("Generation API", () => {
    let projectId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({ name: "Generation Test Project" });
      projectId = response.body.projectId;

      // Upload required files
      const specPath = path.join(
        __dirname,
        "../../../e2e/fixtures/sample-spec.md",
      );
      const rtlPath = path.join(
        __dirname,
        "../../../e2e/fixtures/sample-rtl.sv",
      );

      await request(app)
        .post(`/api/projects/${projectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", specPath);

      await request(app)
        .post(`/api/projects/${projectId}/files/upload`)
        .field("fileType", "rtl")
        .attach("files", rtlPath);
    });

    describe("POST /api/projects/:projectId/generate", () => {
      it("should start generation", async () => {
        const response = await request(app)
          .post(`/api/projects/${projectId}/generate`)
          .send({
            mode: "mvp",
          })
          .expect(200);

        expect(response.body).toHaveProperty("generationId");
        expect(response.body.status).toMatch(/queued|in_progress/);
      });

      it("should reject generation without files", async () => {
        // Create new project without files
        const newProject = await request(app)
          .post("/api/projects")
          .send({ name: "Empty Project" });

        const response = await request(app)
          .post(`/api/projects/${newProject.body.projectId}/generate`)
          .send({ mode: "mvp" })
          .expect(400);

        expect(response.body).toHaveProperty("error");
      });

      it("should accept different generation modes", async () => {
        const modes = ["mvp", "production", "advanced"];

        for (const mode of modes) {
          const response = await request(app)
            .post(`/api/projects/${projectId}/generate`)
            .send({ mode })
            .expect(200);

          expect(response.body).toHaveProperty("generationId");
        }
      });
    });

    describe("GET /api/projects/:projectId/generation/:generationId/status", () => {
      it("should return generation status", async () => {
        // Start generation
        const genResponse = await request(app)
          .post(`/api/projects/${projectId}/generate`)
          .send({ mode: "mvp" });

        const generationId = genResponse.body.generationId;

        // Get status
        const response = await request(app)
          .get(`/api/projects/${projectId}/generation/${generationId}/status`)
          .expect(200);

        expect(response.body).toHaveProperty("status");
        expect(response.body).toHaveProperty("progress");
      });
    });
  });

  describe("Results API", () => {
    let projectId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({ name: "Results Test Project" });
      projectId = response.body.projectId;
    });

    describe("GET /api/projects/:projectId/results", () => {
      it("should return results after generation", async () => {
        // This test would require a completed generation
        // For now, we test the endpoint structure
        const response = await request(app)
          .get(`/api/projects/${projectId}/results`)
          .expect(200);

        expect(response.body).toHaveProperty("uvmTree");
        expect(response.body).toHaveProperty("traceabilityMatrix");
        expect(response.body).toHaveProperty("readinessScore");
      });
    });

    describe("GET /api/projects/:projectId/download", () => {
      it("should return ZIP file", async () => {
        const response = await request(app)
          .get(`/api/projects/${projectId}/download`)
          .expect(200);

        expect(response.headers["content-type"]).toContain("application/zip");
      });
    });
  });

  describe("Health Check", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("database");
    });
  });
});
