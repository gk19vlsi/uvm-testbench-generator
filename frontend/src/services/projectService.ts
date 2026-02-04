/**
 * Project Service
 * API functions for project management
 */

import apiClient from "./api";

export interface Project {
  projectId: string;
  name: string;
  description?: string;
  createdAt: string;
  lastModified: string;
  status: "draft" | "generating" | "completed" | "failed";
  readinessScore?: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface FileMetadata {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
  status: "uploading" | "completed" | "failed";
}

/**
 * Get all projects
 */
export const getProjects = async (): Promise<Project[]> => {
  const response = await apiClient.get("/projects");
  return response.data.projects;
};

/**
 * Get project by ID
 */
export const getProject = async (projectId: string): Promise<Project> => {
  const response = await apiClient.get(`/projects/${projectId}`);
  return response.data.project;
};

/**
 * Create new project
 */
export const createProject = async (
  data: CreateProjectRequest,
): Promise<Project> => {
  const response = await apiClient.post("/projects", data);
  return response.data;
};

/**
 * Delete project
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}`);
};

/**
 * Upload files to project
 */
export const uploadFiles = async (
  projectId: string,
  files: File[],
  fileType: "specification" | "rtl",
  onProgress?: (progress: number) => void,
): Promise<FileMetadata[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });
  formData.append("fileType", fileType);

  const response = await apiClient.post(
    `/projects/${projectId}/files/upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    },
  );

  return response.data.uploadedFiles;
};

/**
 * Delete file from project
 */
export const deleteFile = async (
  projectId: string,
  fileId: string,
): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/files/${fileId}`);
};

/**
 * Start testbench generation
 */
export const startGeneration = async (
  projectId: string,
  mode: "mvp" | "production" | "advanced",
  llmModel?: string,
): Promise<{
  generationId: string;
  status: string;
  websocketUrl: string;
}> => {
  const response = await apiClient.post(`/projects/${projectId}/generate`, {
    mode,
    llmModel,
  });
  return response.data;
};

/**
 * Get generation status
 */
export const getGenerationStatus = async (
  projectId: string,
  generationId: string,
): Promise<{
  generationId: string;
  status: string;
  currentAgent?: string;
  progress: number;
  error?: string;
}> => {
  const response = await apiClient.get(
    `/projects/${projectId}/generation/${generationId}/status`,
  );
  return response.data;
};

/**
 * Get generation results
 */
export const getResults = async (projectId: string): Promise<any> => {
  const response = await apiClient.get(`/projects/${projectId}/results`);
  return response.data;
};

/**
 * Download testbench as ZIP
 */
export const downloadTestbench = async (projectId: string): Promise<Blob> => {
  const response = await apiClient.get(`/projects/${projectId}/download`, {
    responseType: "blob",
  });
  return response.data;
};

/**
 * Get file content
 */
export const getFileContent = async (
  projectId: string,
  filePath: string,
): Promise<{ filePath: string; content: string; language: string }> => {
  const response = await apiClient.get(
    `/projects/${projectId}/files/${encodeURIComponent(filePath)}`,
  );
  return response.data;
};

/**
 * Update file content
 */
export const updateFileContent = async (
  projectId: string,
  filePath: string,
  content: string,
): Promise<{ success: boolean; syntaxErrors?: any[] }> => {
  const response = await apiClient.put(
    `/projects/${projectId}/files/${encodeURIComponent(filePath)}`,
    { content },
  );
  return response.data;
};
