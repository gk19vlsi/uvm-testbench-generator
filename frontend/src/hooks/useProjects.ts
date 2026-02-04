/**
 * useProjects Hook
 * React Query hooks for project management
 */

import { useQuery, useMutation, useQueryClient } from "react-query";
import {
  getProjects,
  getProject,
  createProject,
  deleteProject,
  uploadFiles,
  deleteFile,
  startGeneration,
  getGenerationStatus,
  getResults,
  CreateProjectRequest,
} from "../services/projectService";

/**
 * Hook to fetch all projects
 */
export const useProjects = () => {
  return useQuery("projects", getProjects, {
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch single project
 */
export const useProject = (projectId: string) => {
  return useQuery(["project", projectId], () => getProject(projectId), {
    enabled: !!projectId,
    staleTime: 30000,
  });
};

/**
 * Hook to create project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation((data: CreateProjectRequest) => createProject(data), {
    onSuccess: () => {
      queryClient.invalidateQueries("projects");
    },
  });
};

/**
 * Hook to delete project
 */
export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation((projectId: string) => deleteProject(projectId), {
    onSuccess: () => {
      queryClient.invalidateQueries("projects");
    },
  });
};

/**
 * Hook to upload files
 */
export const useUploadFiles = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      projectId,
      files,
      fileType,
      onProgress,
    }: {
      projectId: string;
      files: File[];
      fileType: "specification" | "rtl";
      onProgress?: (progress: number) => void;
    }) => uploadFiles(projectId, files, fileType, onProgress),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(["project", variables.projectId]);
      },
    },
  );
};

/**
 * Hook to delete file
 */
export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({ projectId, fileId }: { projectId: string; fileId: string }) =>
      deleteFile(projectId, fileId),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(["project", variables.projectId]);
      },
    },
  );
};

/**
 * Hook to start generation
 */
export const useStartGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation(
    ({
      projectId,
      mode,
      llmModel,
    }: {
      projectId: string;
      mode: "mvp" | "production" | "advanced";
      llmModel?: string;
    }) => startGeneration(projectId, mode, llmModel),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(["project", variables.projectId]);
      },
    },
  );
};

/**
 * Hook to fetch generation status
 */
export const useGenerationStatus = (
  projectId: string,
  generationId: string,
  enabled: boolean = true,
) => {
  return useQuery(
    ["generationStatus", projectId, generationId],
    () => getGenerationStatus(projectId, generationId),
    {
      enabled: enabled && !!projectId && !!generationId,
      refetchInterval: 2000, // Poll every 2 seconds
    },
  );
};

/**
 * Hook to fetch generation results
 */
export const useResults = (projectId: string, enabled: boolean = true) => {
  return useQuery(["results", projectId], () => getResults(projectId), {
    enabled: enabled && !!projectId,
    staleTime: 60000, // 1 minute
  });
};
