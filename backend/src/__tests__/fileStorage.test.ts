/**
 * File Storage Service tests
 */

import { FileStorageService } from "../services/FileStorageService";
import path from "path";
import fs from "fs/promises";
import { Readable } from "stream";

describe("File Storage Service", () => {
  const testBaseDir = path.join(__dirname, "../../test-storage");
  let storageService: FileStorageService;
  const testProjectId = "test-project-123";

  beforeAll(async () => {
    storageService = new FileStorageService(testBaseDir);
    await storageService.initialize();
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.rm(testBaseDir, { recursive: true, force: true });
  });

  afterEach(async () => {
    // Clean up test project after each test
    await storageService.deleteProjectFiles(testProjectId);
  });

  describe("Initialization", () => {
    it("should initialize storage directory", async () => {
      const exists = await storageService.fileExists(testBaseDir);
      expect(exists).toBe(true);
    });
  });

  describe("Project Directory Management", () => {
    it("should create project directory structure", async () => {
      await storageService.createProjectDirectories(testProjectId);

      const projectDir = storageService.getProjectDir(testProjectId);
      const uploadsDir = path.join(projectDir, "uploads");
      const specsDir = path.join(uploadsDir, "specifications");
      const rtlDir = path.join(uploadsDir, "rtl");
      const genDir = path.join(projectDir, "generated");

      expect(await storageService.fileExists(projectDir)).toBe(true);
      expect(await storageService.fileExists(uploadsDir)).toBe(true);
      expect(await storageService.fileExists(specsDir)).toBe(true);
      expect(await storageService.fileExists(rtlDir)).toBe(true);
      expect(await storageService.fileExists(genDir)).toBe(true);
    });

    it("should get correct project directory path", () => {
      const projectDir = storageService.getProjectDir(testProjectId);
      expect(projectDir).toBe(path.join(testBaseDir, testProjectId));
    });

    it("should get correct upload directory paths", () => {
      const specDir = storageService.getUploadDir(
        testProjectId,
        "specification",
      );
      const rtlDir = storageService.getUploadDir(testProjectId, "rtl");

      expect(specDir).toContain("specifications");
      expect(rtlDir).toContain("rtl");
    });

    it("should get correct generated directory path", () => {
      const genDir = storageService.getGeneratedDir(testProjectId);
      expect(genDir).toContain("generated");

      const genDirWithId = storageService.getGeneratedDir(
        testProjectId,
        "gen-123",
      );
      expect(genDirWithId).toContain("gen-123");
    });
  });

  describe("File Operations", () => {
    beforeEach(async () => {
      await storageService.createProjectDirectories(testProjectId);
    });

    it("should save file from buffer", async () => {
      const content = "Test file content";
      const buffer = Buffer.from(content);

      const result = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();

      const savedContent = await storageService.readFileAsString(result.path!);
      expect(savedContent).toBe(content);
    });

    it("should save file from stream", async () => {
      const content = "Test stream content";
      const stream = Readable.from([content]);

      const result = await storageService.saveFileStream(
        testProjectId,
        "rtl",
        "test.sv",
        stream,
      );

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();

      const savedContent = await storageService.readFileAsString(result.path!);
      expect(savedContent).toBe(content);
    });

    it("should read file as buffer", async () => {
      const content = "Test content";
      const buffer = Buffer.from(content);

      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      const readBuffer = await storageService.readFile(saveResult.path!);
      expect(readBuffer.toString()).toBe(content);
    });

    it("should read file as string", async () => {
      const content = "Test string content";
      const buffer = Buffer.from(content);

      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      const readString = await storageService.readFileAsString(
        saveResult.path!,
      );
      expect(readString).toBe(content);
    });

    it("should delete file", async () => {
      const buffer = Buffer.from("Test");
      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      const deleted = await storageService.deleteFile(saveResult.path!);
      expect(deleted).toBe(true);

      const exists = await storageService.fileExists(saveResult.path!);
      expect(exists).toBe(false);
    });

    it("should check if file exists", async () => {
      const buffer = Buffer.from("Test");
      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      const exists = await storageService.fileExists(saveResult.path!);
      expect(exists).toBe(true);

      const notExists = await storageService.fileExists(
        "/nonexistent/file.txt",
      );
      expect(notExists).toBe(false);
    });

    it("should get file info", async () => {
      const content = "Test content";
      const buffer = Buffer.from(content);
      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "test.txt",
        buffer,
      );

      const info = await storageService.getFileInfo(saveResult.path!);
      expect(info).toBeDefined();
      expect(info?.exists).toBe(true);
      expect(info?.size).toBe(content.length);
    });

    it("should copy file", async () => {
      const buffer = Buffer.from("Test");
      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "source.txt",
        buffer,
      );

      const destPath = path.join(
        storageService.getUploadDir(testProjectId, "specification"),
        "dest.txt",
      );

      const copied = await storageService.copyFile(saveResult.path!, destPath);
      expect(copied).toBe(true);

      const exists = await storageService.fileExists(destPath);
      expect(exists).toBe(true);
    });

    it("should move file", async () => {
      const buffer = Buffer.from("Test");
      const saveResult = await storageService.saveFile(
        testProjectId,
        "specification",
        "source.txt",
        buffer,
      );

      const destPath = path.join(
        storageService.getUploadDir(testProjectId, "rtl"),
        "moved.txt",
      );

      const moved = await storageService.moveFile(saveResult.path!, destPath);
      expect(moved).toBe(true);

      const sourceExists = await storageService.fileExists(saveResult.path!);
      expect(sourceExists).toBe(false);

      const destExists = await storageService.fileExists(destPath);
      expect(destExists).toBe(true);
    });
  });

  describe("Directory Operations", () => {
    beforeEach(async () => {
      await storageService.createProjectDirectories(testProjectId);
    });

    it("should list files in directory", async () => {
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file1.txt",
        Buffer.from("1"),
      );
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file2.txt",
        Buffer.from("2"),
      );

      const specDir = storageService.getUploadDir(
        testProjectId,
        "specification",
      );
      const files = await storageService.listFiles(specDir);

      expect(files).toHaveLength(2);
      expect(files).toContain("file1.txt");
      expect(files).toContain("file2.txt");
    });

    it("should list project files", async () => {
      await storageService.saveFile(
        testProjectId,
        "specification",
        "spec.pdf",
        Buffer.from("spec"),
      );
      await storageService.saveFile(
        testProjectId,
        "rtl",
        "design.sv",
        Buffer.from("rtl"),
      );

      const files = await storageService.listProjectFiles(testProjectId);

      expect(files.specifications).toHaveLength(1);
      expect(files.specifications).toContain("spec.pdf");
      expect(files.rtl).toHaveLength(1);
      expect(files.rtl).toContain("design.sv");
    });

    it("should get directory size", async () => {
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file1.txt",
        Buffer.from("12345"),
      );
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file2.txt",
        Buffer.from("67890"),
      );

      const specDir = storageService.getUploadDir(
        testProjectId,
        "specification",
      );
      const size = await storageService.getDirectorySize(specDir);

      expect(size).toBe(10); // 5 + 5 bytes
    });

    it("should get project size", async () => {
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file.txt",
        Buffer.from("12345"),
      );

      const size = await storageService.getProjectSize(testProjectId);
      expect(size).toBeGreaterThan(0);
    });

    it("should delete directory", async () => {
      const testDir = path.join(testBaseDir, "test-dir");
      await fs.mkdir(testDir, { recursive: true });

      const deleted = await storageService.deleteDirectory(testDir);
      expect(deleted).toBe(true);

      const exists = await storageService.fileExists(testDir);
      expect(exists).toBe(false);
    });

    it("should delete project files", async () => {
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file.txt",
        Buffer.from("test"),
      );

      const deleted = await storageService.deleteProjectFiles(testProjectId);
      expect(deleted).toBe(true);

      const projectDir = storageService.getProjectDir(testProjectId);
      const exists = await storageService.fileExists(projectDir);
      expect(exists).toBe(false);
    });
  });

  describe("Generated Files", () => {
    beforeEach(async () => {
      await storageService.createProjectDirectories(testProjectId);
    });

    it("should save generated file", async () => {
      const content = "module test(); endmodule";
      const result = await storageService.saveGeneratedFile(
        testProjectId,
        "gen-123",
        "agents/test_agent/test_driver.sv",
        content,
      );

      expect(result.success).toBe(true);
      expect(result.path).toBeDefined();

      const savedContent = await storageService.readFileAsString(result.path!);
      expect(savedContent).toBe(content);
    });

    it("should create nested directory structure for generated files", async () => {
      await storageService.saveGeneratedFile(
        testProjectId,
        "gen-123",
        "agents/agent1/driver.sv",
        "content",
      );

      const genDir = storageService.getGeneratedDir(testProjectId, "gen-123");
      const agentDir = path.join(genDir, "agents", "agent1");

      const exists = await storageService.fileExists(agentDir);
      expect(exists).toBe(true);
    });
  });

  describe("Storage Statistics", () => {
    it("should get storage statistics", async () => {
      await storageService.createProjectDirectories(testProjectId);
      await storageService.saveFile(
        testProjectId,
        "specification",
        "file.txt",
        Buffer.from("test"),
      );

      const stats = await storageService.getStorageStats();

      expect(stats.totalProjects).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageProjectSize).toBeGreaterThan(0);
    });
  });
});
