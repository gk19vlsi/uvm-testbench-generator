/**
 * File upload tests
 * Tests for file upload and deletion endpoints
 */

import request from "supertest";
import { app } from "../index";
import { dbManager } from "../config/database";
import { projectModel } from "../models/Project";
import { fileStorageService } from "../services/FileStorageService";
import path from "path";
import fs from "fs";

describe("File Upload API", () => {
  let testProjectId: string;

  beforeAll(async () => {
    await dbManager.connect();
    await fileStorageService.initialize();
  });

  afterAll(async () => {
    await dbManager.disconnect();
  });

  beforeEach(async () => {
    // Create a test project
    const project = await projectModel.create({
      name: "Test Project for Files",
    });
    testProjectId = project.projectId;

    // Initialize project directories
    await fileStorageService.createProjectDirectories(testProjectId);
  });

  afterEach(async () => {
    // Clean up
    if (testProjectId) {
      await projectModel.delete(testProjectId);
      await fileStorageService.deleteProjectFiles(testProjectId);
    }
  });

  describe("POST /api/projects/:projectId/files/upload", () => {
    it("should upload a specification file (TXT)", async () => {
      const fileContent = "This is a test specification document.";
      const buffer = Buffer.from(fileContent);

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", buffer, "spec.txt")
        .expect(201);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toContain("Successfully uploaded");
      expect(response.body).toHaveProperty("files");
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0]).toHaveProperty("fileId");
      expect(response.body.files[0]).toHaveProperty("filename", "spec.txt");
      expect(response.body.files[0]).toHaveProperty("size");

      // Verify file was added to project
      const project = await projectModel.findByProjectId(testProjectId);
      expect(project?.specificationFiles).toHaveLength(1);
      expect(project?.specificationFiles[0].filename).toBe("spec.txt");
    });

    it("should upload an RTL file (.sv)", async () => {
      const fileContent = `
module counter (
  input clk,
  input rst_n,
  output reg [7:0] count
);
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
      count <= 8'h0;
    else
      count <= count + 1;
  end
endmodule
      `;
      const buffer = Buffer.from(fileContent);

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "rtl")
        .attach("files", buffer, "counter.sv")
        .expect(201);

      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].filename).toBe("counter.sv");

      // Verify file was added to project
      const project = await projectModel.findByProjectId(testProjectId);
      expect(project?.rtlFiles).toHaveLength(1);
      expect(project?.rtlFiles[0].filename).toBe("counter.sv");
    });

    it("should upload multiple files at once", async () => {
      const spec1 = Buffer.from("Specification 1");
      const spec2 = Buffer.from("Specification 2");

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", spec1, "spec1.txt")
        .attach("files", spec2, "spec2.md")
        .expect(201);

      expect(response.body.files).toHaveLength(2);

      // Verify files were added to project
      const project = await projectModel.findByProjectId(testProjectId);
      expect(project?.specificationFiles).toHaveLength(2);
    });

    it("should sanitize filenames", async () => {
      const buffer = Buffer.from("Test content");

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", buffer, "../../../etc/passwd.txt")
        .expect(201);

      // Filename should be sanitized (no path traversal)
      expect(response.body.files[0].filename).not.toContain("..");
      expect(response.body.files[0].filename).not.toContain("/");
    });

    it("should reject invalid file type for specification", async () => {
      const buffer = Buffer.from("Test content");

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", buffer, "invalid.exe")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should reject invalid file type for RTL", async () => {
      const buffer = Buffer.from("Test content");

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "rtl")
        .attach("files", buffer, "invalid.pdf")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should reject upload without fileType", async () => {
      const buffer = Buffer.from("Test content");

      await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .attach("files", buffer, "spec.txt")
        .expect(400);
    });

    it("should reject upload with invalid fileType", async () => {
      const buffer = Buffer.from("Test content");

      await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "invalid")
        .attach("files", buffer, "spec.txt")
        .expect(400);
    });

    it("should reject upload without files", async () => {
      await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .expect(400);
    });

    it("should reject upload to non-existent project", async () => {
      const buffer = Buffer.from("Test content");

      await request(app)
        .post("/api/projects/non-existent-id/files/upload")
        .field("fileType", "specification")
        .attach("files", buffer, "spec.txt")
        .expect(404);
    });

    it("should handle mixed valid and invalid files", async () => {
      const validFile = Buffer.from("Valid content");
      const invalidFile = Buffer.from("Invalid content");

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", validFile, "valid.txt")
        .attach("files", invalidFile, "invalid.exe")
        .expect(201);

      // Should upload valid file and report error for invalid
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].filename).toBe("valid.txt");
      expect(response.body).toHaveProperty("errors");
      expect(response.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe("DELETE /api/projects/:projectId/files/:fileId", () => {
    it("should delete a specification file", async () => {
      // Upload a file first
      const buffer = Buffer.from("Test content");
      const uploadResponse = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", buffer, "spec.txt")
        .expect(201);

      const fileId = uploadResponse.body.files[0].fileId;

      // Delete the file
      const deleteResponse = await request(app)
        .delete(`/api/projects/${testProjectId}/files/${fileId}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty("success", true);

      // Verify file was removed from project
      const project = await projectModel.findByProjectId(testProjectId);
      expect(project?.specificationFiles).toHaveLength(0);
    });

    it("should delete an RTL file", async () => {
      // Upload a file first
      const buffer = Buffer.from("module test; endmodule");
      const uploadResponse = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "rtl")
        .attach("files", buffer, "test.sv")
        .expect(201);

      const fileId = uploadResponse.body.files[0].fileId;

      // Delete the file
      await request(app)
        .delete(`/api/projects/${testProjectId}/files/${fileId}`)
        .expect(200);

      // Verify file was removed from project
      const project = await projectModel.findByProjectId(testProjectId);
      expect(project?.rtlFiles).toHaveLength(0);
    });

    it("should return 404 for non-existent file", async () => {
      await request(app)
        .delete(`/api/projects/${testProjectId}/files/non-existent-id`)
        .expect(404);
    });

    it("should return 404 for non-existent project", async () => {
      await request(app)
        .delete("/api/projects/non-existent-id/files/some-file-id")
        .expect(404);
    });

    it("should succeed even if file deletion from storage fails", async () => {
      // Upload a file first
      const buffer = Buffer.from("Test content");
      const uploadResponse = await request(app)
        .post(`/api/projects/${testProjectId}/files/upload`)
        .field("fileType", "specification")
        .attach("files", buffer, "spec.txt")
        .expect(201);

      const fileId = uploadResponse.body.files[0].fileId;

      // Get project to find file path
      const project = await projectModel.findByProjectId(testProjectId);
      const file = project?.specificationFiles.find((f) => f.fileId === fileId);

      // Delete file from storage manually
      if (file) {
        await fileStorageService.deleteFile(file.storagePath);
      }

      // Delete should still succeed (database is source of truth)
      await request(app)
        .delete(`/api/projects/${testProjectId}/files/${fileId}`)
        .expect(200);

      // Verify file was removed from project
      const updatedProject = await projectModel.findByProjectId(testProjectId);
      expect(updatedProject?.specificationFiles).toHaveLength(0);
    });
  });
});
