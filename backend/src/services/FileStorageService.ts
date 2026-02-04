/**
 * File Storage Service
 * Manages file system storage for uploaded files and generated testbenches
 */

import fs from "fs/promises";
import path from "path";
import { createReadStream, createWriteStream, existsSync } from "fs";
import { pipeline } from "stream/promises";
import { env } from "../config/env";
import logger from "../config/logger";

export interface StorageResult {
  success: boolean;
  path?: string;
  error?: string;
}

export interface FileInfo {
  path: string;
  size: number;
  exists: boolean;
}

export class FileStorageService {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || env.uploadDir;
  }

  /**
   * Initialize storage directory structure
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      logger.info(`File storage initialized at: ${this.baseDir}`);
    } catch (error) {
      logger.error("Failed to initialize file storage:", error);
      throw error;
    }
  }

  /**
   * Create project directory structure
   */
  async createProjectDirectories(projectId: string): Promise<void> {
    const projectDir = this.getProjectDir(projectId);

    const directories = [
      projectDir,
      path.join(projectDir, "uploads"),
      path.join(projectDir, "uploads", "specifications"),
      path.join(projectDir, "uploads", "rtl"),
      path.join(projectDir, "generated"),
    ];

    for (const dir of directories) {
      await fs.mkdir(dir, { recursive: true });
    }

    logger.info(`Created directory structure for project: ${projectId}`);
  }

  /**
   * Get project directory path
   */
  getProjectDir(projectId: string): string {
    return path.join(this.baseDir, projectId);
  }

  /**
   * Get upload directory path
   */
  getUploadDir(projectId: string, fileType: "specification" | "rtl"): string {
    return path.join(
      this.getProjectDir(projectId),
      "uploads",
      fileType === "specification" ? "specifications" : "rtl",
    );
  }

  /**
   * Get generated files directory path
   */
  getGeneratedDir(projectId: string, generationId?: string): string {
    const baseGenDir = path.join(this.getProjectDir(projectId), "generated");
    return generationId ? path.join(baseGenDir, generationId) : baseGenDir;
  }

  /**
   * Save uploaded file
   */
  async saveFile(
    projectId: string,
    fileType: "specification" | "rtl",
    filename: string,
    buffer: Buffer,
  ): Promise<StorageResult> {
    try {
      const uploadDir = this.getUploadDir(projectId, fileType);
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      await fs.writeFile(filePath, buffer);

      logger.info(`Saved file: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error: any) {
      logger.error(`Failed to save file ${filename}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save file from stream
   */
  async saveFileStream(
    projectId: string,
    fileType: "specification" | "rtl",
    filename: string,
    stream: NodeJS.ReadableStream,
  ): Promise<StorageResult> {
    try {
      const uploadDir = this.getUploadDir(projectId, fileType);
      await fs.mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, filename);
      const writeStream = createWriteStream(filePath);

      await pipeline(stream, writeStream);

      logger.info(`Saved file from stream: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error: any) {
      logger.error(`Failed to save file stream ${filename}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Read file
   */
  async readFile(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Read file as string
   */
  async readFileAsString(
    filePath: string,
    encoding: BufferEncoding = "utf-8",
  ): Promise<string> {
    try {
      return await fs.readFile(filePath, encoding);
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Create read stream
   */
  createReadStream(filePath: string): NodeJS.ReadableStream {
    return createReadStream(filePath);
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      await fs.unlink(filePath);
      logger.info(`Deleted file: ${filePath}`);
      return true;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.warn(`File not found for deletion: ${filePath}`);
        return true; // File doesn't exist, consider it deleted
      }
      logger.error(`Failed to delete file ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Delete directory recursively
   */
  async deleteDirectory(dirPath: string): Promise<boolean> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
      logger.info(`Deleted directory: ${dirPath}`);
      return true;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        logger.warn(`Directory not found for deletion: ${dirPath}`);
        return true; // Directory doesn't exist, consider it deleted
      }
      logger.error(`Failed to delete directory ${dirPath}:`, error);
      return false;
    }
  }

  /**
   * Delete all project files
   */
  async deleteProjectFiles(projectId: string): Promise<boolean> {
    const projectDir = this.getProjectDir(projectId);
    return await this.deleteDirectory(projectDir);
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<FileInfo | null> {
    try {
      const stats = await fs.stat(filePath);
      return {
        path: filePath,
        size: stats.size,
        exists: true,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get directory size
   */
  async getDirectorySize(dirPath: string): Promise<number> {
    try {
      let totalSize = 0;
      const files = await fs.readdir(dirPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }

      return totalSize;
    } catch (error) {
      logger.error(`Failed to get directory size ${dirPath}:`, error);
      return 0;
    }
  }

  /**
   * Get project storage size
   */
  async getProjectSize(projectId: string): Promise<number> {
    const projectDir = this.getProjectDir(projectId);
    return await this.getDirectorySize(projectDir);
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    try {
      const files = await fs.readdir(dirPath);
      return files;
    } catch (error) {
      logger.error(`Failed to list files in ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * List all files in project uploads
   */
  async listProjectFiles(
    projectId: string,
    fileType?: "specification" | "rtl",
  ): Promise<{ specifications: string[]; rtl: string[] }> {
    const projectDir = this.getProjectDir(projectId);

    if (fileType === "specification") {
      const specDir = path.join(projectDir, "uploads", "specifications");
      const files = await this.listFiles(specDir);
      return { specifications: files, rtl: [] };
    } else if (fileType === "rtl") {
      const rtlDir = path.join(projectDir, "uploads", "rtl");
      const files = await this.listFiles(rtlDir);
      return { specifications: [], rtl: files };
    } else {
      const specDir = path.join(projectDir, "uploads", "specifications");
      const rtlDir = path.join(projectDir, "uploads", "rtl");
      const [specifications, rtl] = await Promise.all([
        this.listFiles(specDir),
        this.listFiles(rtlDir),
      ]);
      return { specifications, rtl };
    }
  }

  /**
   * Save generated file
   */
  async saveGeneratedFile(
    projectId: string,
    generationId: string,
    relativePath: string,
    content: string,
  ): Promise<StorageResult> {
    try {
      const genDir = this.getGeneratedDir(projectId, generationId);
      const filePath = path.join(genDir, relativePath);
      const fileDir = path.dirname(filePath);

      // Create directory structure
      await fs.mkdir(fileDir, { recursive: true });

      // Write file
      await fs.writeFile(filePath, content, "utf-8");

      logger.info(`Saved generated file: ${filePath}`);
      return { success: true, path: filePath };
    } catch (error: any) {
      logger.error(`Failed to save generated file ${relativePath}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Copy file
   */
  async copyFile(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);
      logger.info(`Copied file from ${sourcePath} to ${destPath}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to copy file from ${sourcePath} to ${destPath}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Move file
   */
  async moveFile(sourcePath: string, destPath: string): Promise<boolean> {
    try {
      const destDir = path.dirname(destPath);
      await fs.mkdir(destDir, { recursive: true });
      await fs.rename(sourcePath, destPath);
      logger.info(`Moved file from ${sourcePath} to ${destPath}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to move file from ${sourcePath} to ${destPath}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Clean up old files (older than specified days)
   */
  async cleanupOldFiles(days: number): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let deletedCount = 0;
      const projects = await fs.readdir(this.baseDir);

      for (const projectId of projects) {
        const projectDir = this.getProjectDir(projectId);
        const stats = await fs.stat(projectDir);

        if (stats.mtime < cutoffDate) {
          const deleted = await this.deleteDirectory(projectDir);
          if (deleted) {
            deletedCount++;
            logger.info(`Cleaned up old project: ${projectId}`);
          }
        }
      }

      logger.info(`Cleaned up ${deletedCount} old projects`);
      return deletedCount;
    } catch (error) {
      logger.error("Failed to cleanup old files:", error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalProjects: number;
    totalSize: number;
    averageProjectSize: number;
  }> {
    try {
      const projects = await fs.readdir(this.baseDir);
      let totalSize = 0;

      for (const projectId of projects) {
        const projectSize = await this.getProjectSize(projectId);
        totalSize += projectSize;
      }

      return {
        totalProjects: projects.length,
        totalSize,
        averageProjectSize:
          projects.length > 0 ? totalSize / projects.length : 0,
      };
    } catch (error) {
      logger.error("Failed to get storage stats:", error);
      return {
        totalProjects: 0,
        totalSize: 0,
        averageProjectSize: 0,
      };
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
export default fileStorageService;
