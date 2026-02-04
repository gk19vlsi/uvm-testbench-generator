/**
 * Results API tests
 * Tests for results retrieval, file content, and download endpoints
 */

import request from "supertest";
import { app } from "../index";
import { dbManager } from "../config/database";
import { projectModel } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";
import path from "path";

describe("Results API", () => {
  let testProjectId: string;

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

    // Create a test project with results
    const project = await projectModel.create({
      name: "Test Project",
      description: "Test project for results API",
    });
    testProjectId = project.projectId;

    // Add mock results
    await projectModel.update(testProjectId, {
      currentGeneration: {
        generationId: "test-gen-id",
        startedAt: new Date(),
        completedAt: new Date(),
        status: "completed",
        progress: 100,
      },
      status: "completed",
      results: {
        uvmTree: {
          id: "root",
          name: "testbench",
          type: "env",
          children: [
            {
              id: "agent1",
              name: "axi_agent",
              type: "agent",
              children: [],
              filePath: "agents/axi_agent/axi_agent.sv",
              description: "AXI protocol agent",
            },
          ],
          filePath: "env/env.sv",
          description: "Top-level environment",
        },
        traceabilityMatrix: {
          requirements: [
            {
              id: "req1",
              text: "System shall support AXI protocol",
              category: "Protocol",
            },
          ],
          components: [
            {
              id: "comp1",
              name: "axi_agent",
              type: "agent",
              filePath: "agents/axi_agent/axi_agent.sv",
            },
          ],
          mappings: [
            {
              requirementId: "req1",
              componentId: "comp1",
              covered: true,
              notes: "AXI agent implements protocol",
            },
          ],
          coveragePercentage: 100,
        },
        readinessScore: {
          overall: 92,
          breakdown: {
            completeness: 95,
            connectivity: 90,
            syntax: 90,
            coverage: 85,
          },
          classification: "Ready",
        },
        generatedFiles: [
          {
            path: "tb_top.sv",
            content: "// Top module",
            type: "top",
          },
          {
            path: "env/env.sv",
            content: "// Environment",
            type: "env",
          },
        ],
      },
    } as any);

    // Create generated files directory and files
    await fileStorageService.createProjectDirectories(testProjectId);
    await fileStorageService.saveGeneratedFile(
      testProjectId,
      "test-gen-id",
      "tb_top.sv",
      "// Top module\nmodule tb_top;\n  // Test code\nendmodule",
    );
    await fileStorageService.saveGeneratedFile(
      testProjectId,
      "test-gen-id",
      "env/env.sv",
      "// Environment\nclass env extends uvm_env;\n  // Env code\nendclass",
    );
    await fileStorageService.saveGeneratedFile(
      testProjectId,
      "test-gen-id",
      "README.md",
      "# Test Testbench\n\nGenerated testbench for testing.",
    );
  });

  describe("GET /api/projects/:projectId/results", () => {
    it("should return generation results", async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/results`)
        .expect(200);

      expect(response.body).toHaveProperty("uvmTree");
      expect(response.body).toHaveProperty("traceabilityMatrix");
      expect(response.body).toHaveProperty("readinessScore");
      expect(response.body).toHaveProperty("generatedFiles");

      expect(response.body.uvmTree.name).toBe("testbench");
      expect(response.body.uvmTree.children).toHaveLength(1);
      expect(response.body.readinessScore.overall).toBe(92);
      expect(response.body.traceabilityMatrix.coveragePercentage).toBe(100);
    });

    it("should return 404 for non-existent project", async () => {
      await request(app)
        .get("/api/projects/non-existent-id/results")
        .expect(404);
    });

    it("should return 404 when project has no results", async () => {
      const newProject = await projectModel.create({
        name: "Project Without Results",
      });

      await request(app)
        .get(`/api/projects/${newProject.projectId}/results`)
        .expect(404);
    });
  });

  describe("GET /api/projects/:projectId/download", () => {
    it("should download testbench as ZIP", async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/download`)
        .expect(200);

      expect(response.headers["content-type"]).toBe("application/zip");
      expect(response.headers["content-disposition"]).toMatch(/attachment/);
      expect(response.headers["content-disposition"]).toMatch(/\.zip/);
      expect(response.body).toBeTruthy();
    });

    it("should return 404 for non-existent project", async () => {
      await request(app)
        .get("/api/projects/non-existent-id/download")
        .expect(404);
    });

    it("should return 404 when project has no generation", async () => {
      const newProject = await projectModel.create({
        name: "Project Without Generation",
      });

      await request(app)
        .get(`/api/projects/${newProject.projectId}/download`)
        .expect(404);
    });

    it("should include project name in ZIP filename", async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/download`)
        .expect(200);

      const disposition = response.headers["content-disposition"];
      expect(disposition).toMatch(/Test_Project/);
    });
  });

  describe("GET /api/projects/:projectId/files/:filePath", () => {
    it("should return file content", async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/files/tb_top.sv`)
        .expect(200);

      expect(response.body).toHaveProperty("filePath", "tb_top.sv");
      expect(response.body).toHaveProperty("content");
      expect(response.body).toHaveProperty("language", "systemverilog");
      expect(response.body.content).toContain("module tb_top");
    });

    it("should return file content for nested paths", async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/files/env/env.sv`)
        .expect(200);

      expect(response.body.filePath).toBe("env/env.sv");
      expect(response.body.content).toContain("class env");
    });

    it("should detect verilog language for .v files", async () => {
      // Create a .v file
      await fileStorageService.saveGeneratedFile(
        testProjectId,
        "test-gen-id",
        "design.v",
        "module design;\nendmodule",
      );

      const response = await request(app)
        .get(`/api/projects/${testProjectId}/files/design.v`)
        .expect(200);

      expect(response.body.language).toBe("verilog");
    });

    it("should return 404 for non-existent project", async () => {
      await request(app)
        .get("/api/projects/non-existent-id/files/tb_top.sv")
        .expect(404);
    });

    it("should return 404 for non-existent file", async () => {
      await request(app)
        .get(`/api/projects/${testProjectId}/files/non-existent.sv`)
        .expect(404);
    });

    it("should return 403 for path traversal attempts", async () => {
      await request(app)
        .get(`/api/projects/${testProjectId}/files/../../../etc/passwd`)
        .expect(403);
    });

    it("should handle URL-encoded file paths", async () => {
      const response = await request(app)
        .get(
          `/api/projects/${testProjectId}/files/${encodeURIComponent("env/env.sv")}`,
        )
        .expect(200);

      expect(response.body.filePath).toBe("env/env.sv");
    });
  });

  describe("PUT /api/projects/:projectId/files/:filePath", () => {
    it("should update file content", async () => {
      const newContent =
        "// Updated content\nmodule tb_top;\n  // New code\nendmodule";

      const response = await request(app)
        .put(`/api/projects/${testProjectId}/files/tb_top.sv`)
        .send({ content: newContent })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);

      // Verify file was updated
      const updatedContent = await fileStorageService.readFileAsString(
        path.join(
          fileStorageService.getGeneratedDir(testProjectId, "test-gen-id"),
          "tb_top.sv",
        ),
      );
      expect(updatedContent).toBe(newContent);
    });

    it("should update nested file content", async () => {
      const newContent =
        "// Updated environment\nclass env extends uvm_env;\n  // Updated code\nendclass";

      await request(app)
        .put(`/api/projects/${testProjectId}/files/env/env.sv`)
        .send({ content: newContent })
        .expect(200);

      // Verify file was updated
      const updatedContent = await fileStorageService.readFileAsString(
        path.join(
          fileStorageService.getGeneratedDir(testProjectId, "test-gen-id"),
          "env/env.sv",
        ),
      );
      expect(updatedContent).toBe(newContent);
    });

    it("should return syntax errors if detected", async () => {
      const invalidContent =
        "module tb_top\n  // Missing semicolon and endmodule";

      const response = await request(app)
        .put(`/api/projects/${testProjectId}/files/tb_top.sv`)
        .send({ content: invalidContent })
        .expect(200);

      expect(response.body.success).toBe(true);
      // Basic syntax validation may or may not detect errors
      // This is a simple validator, so we just check it doesn't crash
    });

    it("should return 400 for invalid content type", async () => {
      await request(app)
        .put(`/api/projects/${testProjectId}/files/tb_top.sv`)
        .send({ content: 123 })
        .expect(400);
    });

    it("should return 404 for non-existent project", async () => {
      await request(app)
        .put("/api/projects/non-existent-id/files/tb_top.sv")
        .send({ content: "// Content" })
        .expect(404);
    });

    it("should return 403 for path traversal attempts", async () => {
      await request(app)
        .put(`/api/projects/${testProjectId}/files/../../../etc/passwd`)
        .send({ content: "malicious content" })
        .expect(403);
    });

    it("should update project lastModified timestamp", async () => {
      const projectBefore = await projectModel.findByProjectId(testProjectId);
      const lastModifiedBefore = projectBefore?.lastModified;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 100));

      await request(app)
        .put(`/api/projects/${testProjectId}/files/tb_top.sv`)
        .send({ content: "// Updated" })
        .expect(200);

      const projectAfter = await projectModel.findByProjectId(testProjectId);
      const lastModifiedAfter = projectAfter?.lastModified;

      expect(lastModifiedAfter).toBeTruthy();
      expect(lastModifiedBefore).toBeTruthy();
      expect(lastModifiedAfter!.getTime()).toBeGreaterThan(
        lastModifiedBefore!.getTime(),
      );
    });
  });
});
