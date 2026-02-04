export type FileType = "specification" | "rtl";
export type FileStatus = "uploading" | "completed" | "failed";

export interface FileReference {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  storagePath: string; // File system path
}

export interface FileMetadata {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  status: FileStatus;
  progress: number; // 0-100
}

export interface UploadFilesRequest {
  files: File[]; // multipart form data
  fileType: FileType;
}

export interface UploadFilesResponse {
  uploadedFiles: FileMetadata[];
}

export interface DeleteFileResponse {
  success: boolean;
}

export interface UploadError {
  filename: string;
  error: string;
  code?: string;
}
