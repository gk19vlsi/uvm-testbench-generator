/**
 * Multer configuration for file uploads
 */

import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// File type validation
const ALLOWED_SPEC_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/markdown",
  "text/plain",
];

const ALLOWED_RTL_TYPES = ["text/plain", "application/octet-stream"];

const ALLOWED_SPEC_EXTENSIONS = [".pdf", ".docx", ".md", ".txt"];
const ALLOWED_RTL_EXTENSIONS = [".sv", ".v"];

// File size limits (50MB per file, 200MB per project)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
export const MAX_PROJECT_SIZE = 200 * 1024 * 1024; // 200MB

/**
 * File filter for specification files
 */
export const specFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_SPEC_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_SPEC_EXTENSIONS.join(", ")}`,
      ),
    );
  }
};

/**
 * File filter for RTL files
 */
export const rtlFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (ALLOWED_RTL_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type. Allowed types: ${ALLOWED_RTL_EXTENSIONS.join(", ")}`,
      ),
    );
  }
};

/**
 * Multer configuration for memory storage
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10, // Max 10 files per request
  },
});

/**
 * Get MIME type from file extension
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const mimeTypes: { [key: string]: string } = {
    ".pdf": "application/pdf",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".md": "text/markdown",
    ".txt": "text/plain",
    ".sv": "text/plain",
    ".v": "text/plain",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  fileType: "specification" | "rtl",
): boolean {
  const ext = path.extname(filename).toLowerCase();

  if (fileType === "specification") {
    return ALLOWED_SPEC_EXTENSIONS.includes(ext);
  } else {
    return ALLOWED_RTL_EXTENSIONS.includes(ext);
  }
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  const basename = path.basename(filename);

  // Replace unsafe characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, "_");
}
