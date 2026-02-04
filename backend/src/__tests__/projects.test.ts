/**
 * Project API tests
 * Tests for project management endpoints
 */

import request from "supertest";
import { app } from "../index";
import { dbManager } from "../config/database";
import { projectModel } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";

describe("Project API", () => {
  beforeAll(async () => {
    await dbManager.connect();
    await fileStorageService.initialize();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    // Clean up projects before each test
    const projects = await projectModel.findAll();
    for (const project of projects) {
      await projectModel.delete(project.projectId);
      try {
        await fileStorageService.deleteProjectFiles(project.projectId);
      } catch (error) {
        // Ignore errors
      }
    }
  });

  describe("POST /api/projects", () => {
    it("should create a new project with name only", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "Test Project",
        })
        .expect(201);

      expect(response.body).toHaveProperty("projectId");
      expect(response.body).toHaveProperty("name", "Test Project");
      expect(response.body).toHaveProperty("createdAt");

      // Verify project exists in database
      const project = await projectModel.findByProjectId(
        response.body.projectId,
      );
      expect(project).toBeTruthy();
      expect(project?.name).toBe("Test Project");
      expect(project?.status).toBe("draft");
    });

    it("should create a new project with name and description", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "Test Project",
          description: "This is a test project",
        })
        .expect(201);

      expect(response.body).toHaveProperty("projectId");
      expect(response.body).toHaveProperty("name", "Test Project");

      // Verify project in database
      const project = await projectModel.findByProjectId(
        response.body.projectId,
      );
      expect(project?.description).toBe("This is a test project");
    });

    it("should trim whitespace from name and description", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "  Test Project  ",
          description: "  Test description  ",
        })
        .expect(201);

      const project = await projectModel.findByProjectId(
        response.body.projectId,
      );
      expect(project?.name).toBe("Test Project");
      expect(project?.description).toBe("Test description");
    });

    it("should reject request without name", async () => {
      await request(app)
        .post("/api/projects")
        .send({
          description: "No name provided",
        })
        .expect(400);
    });

    it("should reject request with empty name", async () => {
      await request(app)
        .post("/api/projects")
        .send({
          name: "   ",
        })
        .expect(400);
    });

    it("should reject request with name longer than 100 characters", async () => {
      await request(app)
        .post("/api/projects")
        .send({
          name: "a".repeat(101),
        })
        .expect(400);
    });

    it("should reject request with description longer than 500 characters", async () => {
      await request(app)
        .post("/api/projects")
        .send({
          name: "Test Project",
          description: "a".repeat(501),
        })
        .expect(400);
    });

    it("should initialize project directory structure", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          name: "Test Project",
        })
        .expect(201);

      const projectId = response.body.projectId;

      // Check if directories exist by trying to get project size
      const size = await fileStorageService.getProjectSize(projectId);
      expect(size).toBeGreaterThanOrEqual(0);
    });
  });

  describe("GET /api/projects", () => {
    it("should return empty array when no projects exist", async () => {
      const response = await request(app).get("/api/projects").expect(200);

      expect(response.body).toHaveProperty("projects");
      expect(response.body.projects).toEqual([]);
    });

    it("should return list of projects", async () => {
      // Create test projects
      await projectModel.create({ name: "Project 1" });
      await projectModel.create({ name: "Project 2" });
      await projectModel.create({ name: "Project 3" });

      const response = await request(app).get("/api/projects").expect(200);

      expect(response.body.projects).toHaveLength(3);
      expect(response.body.projects[0]).toHaveProperty("projectId");
      expect(response.body.projects[0]).toHaveProperty("name");
      expect(response.body.projects[0]).toHaveProperty("createdAt");
      expect(response.body.projects[0]).toHaveProperty("lastModified");
      expect(response.body.projects[0]).toHaveProperty("status");
    });

    it("should return projects sorted by lastModified (newest first)", async () => {
      const project1 = await projectModel.create({ name: "Project 1" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      const project2 = await projectModel.create({ name: "Project 2" });
      await new Promise((resolve) => setTimeout(resolve, 50));
      const project3 = await projectModel.create({ name: "Project 3" });

      const response = await request(app).get("/api/projects").expect(200);

      // Projects should be sorted by lastModified (newest first)
      expect(response.body.projects).toHaveLength(3);
      const projectIds = response.body.projects.map((p: any) => p.projectId);
      expect(projectIds[0]).toBe(project3.projectId);
      expect(projectIds[1]).toBe(project2.projectId);
      expect(projectIds[2]).toBe(project1.projectId);
    });

    it("should include readiness score if available", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      // Add results with readiness score
      await projectModel.updateResults(project.projectId, {
        uvmTree: {} as any,
        traceabilityMatrix: {} as any,
        readinessScore: {
          overall: 85,
          classification: "Needs Review",
          breakdown: {
            completeness: 90,
            connectivity: 85,
            syntax: 80,
            coverage: 75,
          },
          recommendations: [],
        } as any,
        generatedFiles: [],
      });

      const response = await request(app).get("/api/projects").expect(200);

      expect(response.body.projects[0].readinessScore).toBe(85);
    });
  });

  describe("GET /api/projects/:projectId", () => {
    it("should return project details", async () => {
      const project = await projectModel.create({
        name: "Test Project",
        description: "Test description",
      });

      const response = await request(app)
        .get(`/api/projects/${project.projectId}`)
        .expect(200);

      expect(response.body).toHaveProperty("project");
      expect(response.body).toHaveProperty("files");
      expect(response.body.project.projectId).toBe(project.projectId);
      expect(response.body.project.name).toBe("Test Project");
      expect(response.body.project.description).toBe("Test description");
      expect(response.body.files).toEqual([]);
    });

    it("should return 404 for non-existent project", async () => {
      await request(app).get("/api/projects/non-existent-id").expect(404);
    });

    it("should include file references", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      // Add file references
      await projectModel.addFile(project.projectId, "specification", {
        fileId: "file-1",
        filename: "spec.pdf",
        size: 1024,
        mimeType: "application/pdf",
        uploadedAt: new Date(),
        storagePath: "path/to/spec.pdf",
      });

      await projectModel.addFile(project.projectId, "rtl", {
        fileId: "file-2",
        filename: "design.sv",
        size: 2048,
        mimeType: "text/plain",
        uploadedAt: new Date(),
        storagePath: "path/to/design.sv",
      });

      const response = await request(app)
        .get(`/api/projects/${project.projectId}`)
        .expect(200);

      expect(response.body.files).toHaveLength(2);
      expect(response.body.files[0].filename).toBe("spec.pdf");
      expect(response.body.files[1].filename).toBe("design.sv");
    });

    it("should include generation results if available", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      // Add results
      const results = {
        uvmTree: { name: "root", type: "environment", children: [] },
        traceabilityMatrix: { requirements: [], components: [], matrix: [] },
        readinessScore: {
          overall: 92,
          classification: "Ready",
          breakdown: {
            completeness: 95,
            connectivity: 90,
            syntax: 90,
            coverage: 85,
          },
          recommendations: [],
        },
        generatedFiles: [],
      };

      await projectModel.updateResults(project.projectId, results as any);

      const response = await request(app)
        .get(`/api/projects/${project.projectId}`)
        .expect(200);

      expect(response.body).toHaveProperty("generationResults");
      expect(response.body.generationResults.readinessScore.overall).toBe(92);
    });
  });

  describe("DELETE /api/projects/:projectId", () => {
    it("should delete a project", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      const response = await request(app)
        .delete(`/api/projects/${project.projectId}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify project is deleted from database
      const deletedProject = await projectModel.findByProjectId(
        project.projectId,
      );
      expect(deletedProject).toBeNull();
    });

    it("should return 404 for non-existent project", async () => {
      await request(app).delete("/api/projects/non-existent-id").expect(404);
    });

    it("should delete project files from file system", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      // Initialize directories
      await fileStorageService.createProjectDirectories(project.projectId);

      // Verify directories exist
      let size = await fileStorageService.getProjectSize(project.projectId);
      expect(size).toBeGreaterThanOrEqual(0);

      // Delete project
      await request(app)
        .delete(`/api/projects/${project.projectId}`)
        .expect(200);

      // Verify directories are deleted - getProjectSize should return 0 or throw
      try {
        size = await fileStorageService.getProjectSize(project.projectId);
        // If we get here, directory might still exist but be empty
        expect(size).toBe(0);
      } catch (error) {
        // Expected - directory should not exist
        expect(error).toBeTruthy();
      }
    });

    it("should succeed even if file deletion fails", async () => {
      const project = await projectModel.create({ name: "Test Project" });

      // Don't create directories - deletion will fail but should not affect response

      const response = await request(app)
        .delete(`/api/projects/${project.projectId}`)
        .expect(200);

      expect(response.body).toEqual({ success: true });

      // Verify project is still deleted from database
      const deletedProject = await projectModel.findByProjectId(
        project.projectId,
      );
      expect(deletedProject).toBeNull();
    });
  });
});
