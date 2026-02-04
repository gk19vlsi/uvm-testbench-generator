import { fileStorageService } from "../../services/FileStorageService";
import { setupIntegrationTests, teardownIntegrationTests } from "./setup";
import * as path from "path";
import * as fs from "fs";

describe("File Storage Integration Tests", () => {
  const testProjectId = "test-project-123";
  const testContent = "Test file content";

  beforeAll(async () => {
    await setupIntegrationTests();
    await fileStorageService.initialize();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });

  beforeEach(async () => {
    // Clean up test project directory
    const projectDir = fileStorageService.getProjectDirectory(testProjectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  describe("Project Directory Management", () => {
    it("should create project directory structure", async () => {
      await fileStorageService.createProjectDirectories(testProjectId);

      const projectDir = fileStorageService.getProjectDirectory(testProjectId);
      expect(fs.existsSync(projectDir)).toBe(true);

      const uploadsDir = path.join(projectDir, "uploads");
      expect(fs.existsSync(uploadsDir)).toBe(true);

      const generatedDir = path.join(projectDir, "generated");
      expect(fs.existsSync(generatedDir)).toBe(true);
    });

    it("should get project directory path", () => {
      const projectDir = fileStorageService.getProjectDirectory(testProjectId);
      expect(projectDir).toContain(testProjectId);
      expect(projectDir).toContain("projects");
    });

    it("should delete project directory", async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
      const projectDir = fileStorageService.getProjectDirectory(testProjectId);

      expect(fs.existsSync(projectDir)).toBe(true);

      await fileStorageService.deleteProjectDirectory(testProjectId);

      expect(fs.existsSync(projectDir)).toBe(false);
    });
  });

  describe("File Upload Storage", () => {
    beforeEach(async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
    });

    it("should save uploaded specification file", async () => {
      const filename = "test-spec.md";
      const buffer = Buffer.from(testContent);

      const filePath = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer,
      );

      expect(fs.existsSync(filePath)).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toBe(testContent);
    });

    it("should save uploaded RTL file", async () => {
      const filename = "test-design.sv";
      const buffer = Buffer.from(testContent);

      const filePath = await fileStorageService.saveUploadedFile(
        testProjectId,
        "rtl",
        filename,
        buffer,
      );

      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain("rtl");
    });

    it("should handle file name conflicts", async () => {
      const filename = "duplicate.md";
      const buffer1 = Buffer.from("Content 1");
      const buffer2 = Buffer.from("Content 2");

      const filePath1 = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer1,
      );

      const filePath2 = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer2,
      );

      expect(filePath1).not.toBe(filePath2);
      expect(fs.existsSync(filePath1)).toBe(true);
      expect(fs.existsSync(filePath2)).toBe(true);
    });

    it("should delete uploaded file", async () => {
      const filename = "to-delete.md";
      const buffer = Buffer.from(testContent);

      const filePath = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer,
      );

      expect(fs.existsSync(filePath)).toBe(true);

      await fileStorageService.deleteFile(filePath);

      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe("Generated File Storage", () => {
    beforeEach(async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
    });

    it("should save generated file", async () => {
      const generationId = "gen-123";
      const filename = "tb_top.sv";
      const content = "// Generated testbench";

      const filePath = await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        filename,
        content,
      );

      expect(fs.existsSync(filePath)).toBe(true);
      const savedContent = fs.readFileSync(filePath, "utf-8");
      expect(savedContent).toBe(content);
    });

    it("should create subdirectories for generated files", async () => {
      const generationId = "gen-123";
      const filename = "agents/axi_agent/axi_driver.sv";
      const content = "// Driver code";

      const filePath = await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        filename,
        content,
      );

      expect(fs.existsSync(filePath)).toBe(true);
      expect(filePath).toContain("agents");
      expect(filePath).toContain("axi_agent");
    });

    it("should list generated files", async () => {
      const generationId = "gen-123";

      await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        "file1.sv",
        "content1",
      );

      await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        "file2.sv",
        "content2",
      );

      const files = await fileStorageService.listGeneratedFiles(
        testProjectId,
        generationId,
      );

      expect(files.length).toBeGreaterThanOrEqual(2);
      expect(files.some((f) => f.includes("file1.sv"))).toBe(true);
      expect(files.some((f) => f.includes("file2.sv"))).toBe(true);
    });
  });

  describe("File Reading", () => {
    beforeEach(async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
    });

    it("should read file content", async () => {
      const filename = "test-read.md";
      const buffer = Buffer.from(testContent);

      const filePath = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer,
      );

      const content = await fileStorageService.readFile(filePath);
      expect(content).toBe(testContent);
    });

    it("should handle non-existent file", async () => {
      const nonExistentPath = path.join(
        fileStorageService.getProjectDirectory(testProjectId),
        "non-existent.txt",
      );

      await expect(
        fileStorageService.readFile(nonExistentPath),
      ).rejects.toThrow();
    });
  });

  describe("ZIP Archive Creation", () => {
    beforeEach(async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
    });

    it("should create ZIP archive of generated files", async () => {
      const generationId = "gen-123";

      // Create some test files
      await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        "tb_top.sv",
        "// Top module",
      );

      await fileStorageService.saveGeneratedFile(
        testProjectId,
        generationId,
        "README.md",
        "# Testbench",
      );

      const zipPath = await fileStorageService.createZipArchive(
        testProjectId,
        generationId,
      );

      expect(fs.existsSync(zipPath)).toBe(true);
      expect(zipPath).toMatch(/\.zip$/);

      // Clean up
      fs.unlinkSync(zipPath);
    });

    it("should include all files in ZIP", async () => {
      const generationId = "gen-123";

      const files = [
        "tb_top.sv",
        "interfaces/axi_if.sv",
        "agents/axi_agent/axi_driver.sv",
        "README.md",
      ];

      for (const file of files) {
        await fileStorageService.saveGeneratedFile(
          testProjectId,
          generationId,
          file,
          `// ${file}`,
        );
      }

      const zipPath = await fileStorageService.createZipArchive(
        testProjectId,
        generationId,
      );

      expect(fs.existsSync(zipPath)).toBe(true);

      const stats = fs.statSync(zipPath);
      expect(stats.size).toBeGreaterThan(0);

      // Clean up
      fs.unlinkSync(zipPath);
    });
  });

  describe("File Metadata", () => {
    beforeEach(async () => {
      await fileStorageService.createProjectDirectories(testProjectId);
    });

    it("should get file size", async () => {
      const filename = "test-size.md";
      const content = "A".repeat(1000);
      const buffer = Buffer.from(content);

      const filePath = await fileStorageService.saveUploadedFile(
        testProjectId,
        "specification",
        filename,
        buffer,
      );

      const size = await fileStorageService.getFileSize(filePath);
      expect(size).toBe(1000);
    });

    it("should get file extension", () => {
      const extensions = [
        ["test.md", ".md"],
        ["design.sv", ".sv"],
        ["spec.pdf", ".pdf"],
        ["file.tar.gz", ".gz"],
      ];

      for (const [filename, expectedExt] of extensions) {
        const ext = fileStorageService.getFileExtension(filename);
        expect(ext).toBe(expectedExt);
      }
    });

    it("should validate file type", () => {
      const validSpec = fileStorageService.isValidFileType(
        "spec.md",
        "specification",
      );
      expect(validSpec).toBe(true);

      const validRtl = fileStorageService.isValidFileType("design.sv", "rtl");
      expect(validRtl).toBe(true);

      const invalid = fileStorageService.isValidFileType(
        "image.jpg",
        "specification",
      );
      expect(invalid).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid project ID", async () => {
      await expect(
        fileStorageService.createProjectDirectories(""),
      ).rejects.toThrow();
    });

    it("should handle write errors", async () => {
      const invalidPath = "/invalid/path/file.txt";

      await expect(
        fileStorageService.saveGeneratedFile(
          "invalid-project",
          "gen-123",
          invalidPath,
          "content",
        ),
      ).rejects.toThrow();
    });

    it("should handle read errors for non-existent files", async () => {
      await expect(
        fileStorageService.readFile("/non/existent/file.txt"),
      ).rejects.toThrow();
    });
  });
});
