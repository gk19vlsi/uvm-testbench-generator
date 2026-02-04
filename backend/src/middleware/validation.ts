import { Request, Response, NextFunction } from "express";
import logger from "../config/logger";
import * as path from "path";

/**
 * Input validation middleware for API endpoints
 */

// File size limits
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB per file
  MAX_PROJECT_SIZE: 200 * 1024 * 1024, // 200MB per project
};

// Allowed MIME types
export const ALLOWED_MIME_TYPES = {
  specification: [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
    "text/plain",
  ],
  rtl: ["text/plain", "text/x-verilog", "text/x-systemverilog"],
};

// Allowed file extensions
export const ALLOWED_EXTENSIONS = {
  specification: [".pdf", ".docx", ".md", ".txt"],
  rtl: [".sv", ".v", ".vh", ".svh"],
};

/**
 * Validate project name
 */
export function validateProjectName(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({
      error: "Project name is required and must be a string",
    });
  }

  if (name.length < 1 || name.length > 100) {
    return res.status(400).json({
      error: "Project name must be between 1 and 100 characters",
    });
  }

  // Sanitize project name (remove special characters that could cause issues)
  const sanitizedName = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "");
  if (sanitizedName !== name) {
    return res.status(400).json({
      error: "Project name contains invalid characters",
    });
  }

  next();
}

/**
 * Validate project ID format
 */
export function validateProjectId(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { projectId } = req.params;

  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({
      error: "Invalid project ID",
    });
  }

  // UUID format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(projectId)) {
    return res.status(400).json({
      error: "Invalid project ID format",
    });
  }

  next();
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const files = req.files as Express.Multer.File[] | undefined;
  const { fileType } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({
      error: "No files uploaded",
    });
  }

  if (!fileType || !["specification", "rtl"].includes(fileType)) {
    return res.status(400).json({
      error: 'Invalid file type. Must be "specification" or "rtl"',
    });
  }

  // Validate each file
  for (const file of files) {
    // Check file size
    if (file.size > FILE_SIZE_LIMITS.MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File ${file.originalname} exceeds maximum size of 50MB`,
      });
    }

    // Sanitize filename (prevent path traversal)
    const sanitizedFilename = sanitizeFilename(file.originalname);
    if (sanitizedFilename !== file.originalname) {
      return res.status(400).json({
        error: `File ${file.originalname} has invalid characters in filename`,
      });
    }

    // Validate file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts =
      ALLOWED_EXTENSIONS[fileType as keyof typeof ALLOWED_EXTENSIONS];
    if (!allowedExts.includes(ext)) {
      return res.status(400).json({
        error: `File ${file.originalname} has invalid extension. Allowed: ${allowedExts.join(", ")}`,
      });
    }

    // Validate MIME type
    const allowedMimes =
      ALLOWED_MIME_TYPES[fileType as keyof typeof ALLOWED_MIME_TYPES];
    if (!allowedMimes.includes(file.mimetype)) {
      return res.status(400).json({
        error: `File ${file.originalname} has invalid MIME type. Allowed: ${allowedMimes.join(", ")}`,
      });
    }
  }

  next();
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  let sanitized = filename.replace(/[/\\:\x00]/g, "");

  // Remove leading dots (hidden files)
  sanitized = sanitized.replace(/^\.+/, "");

  // Remove parent directory references
  sanitized = sanitized.replace(/\.\./g, "");

  // Limit length
  if (sanitized.length > 255) {
    const ext = path.extname(sanitized);
    const name = path.basename(sanitized, ext);
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Validate generation request
 */
export function validateGenerationRequest(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { mode } = req.body;

  if (!mode || !["mvp", "production", "advanced"].includes(mode)) {
    return res.status(400).json({
      error:
        'Invalid generation mode. Must be "mvp", "production", or "advanced"',
    });
  }

  next();
}

/**
 * Validate LLM configuration
 */
export function validateLLMConfig(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { provider, model } = req.body;

  if (!provider || typeof provider !== "string") {
    return res.status(400).json({
      error: "Provider is required and must be a string",
    });
  }

  if (provider !== "openai") {
    return res.status(400).json({
      error: 'Invalid provider. Currently only "openai" is supported',
    });
  }

  if (!model || typeof model !== "string") {
    return res.status(400).json({
      error: "Model is required and must be a string",
    });
  }

  const validModels = ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"];
  if (!validModels.includes(model)) {
    return res.status(400).json({
      error: `Invalid model. Must be one of: ${validModels.join(", ")}`,
    });
  }

  next();
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { page, limit } = req.query;

  if (page !== undefined) {
    const pageNum = parseInt(page as string, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: "Page must be a positive integer",
      });
    }
  }

  if (limit !== undefined) {
    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: "Limit must be between 1 and 100",
      });
    }
  }

  next();
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Validate file path to prevent directory traversal
 */
export function validateFilePath(filePath: string): boolean {
  // Normalize path
  const normalized = path.normalize(filePath);

  // Check for parent directory references
  if (normalized.includes("..")) {
    return false;
  }

  // Check for absolute paths
  if (path.isAbsolute(normalized)) {
    return false;
  }

  return true;
}

/**
 * Log validation errors
 */
export function logValidationError(req: Request, error: string) {
  logger.warn("Validation error", {
    ip: req.ip,
    method: req.method,
    path: req.path,
    error,
  });
}
