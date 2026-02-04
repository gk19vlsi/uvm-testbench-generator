/**
 * File Upload Section Component
 * Handles specification and RTL file uploads with drag-and-drop
 * Integrates with backend API for file upload and management
 */

import { useState, useEffect } from "react";
import { uploadFiles, deleteFile } from "../services/projectService";
import type { FileMetadata } from "../services/projectService";

interface FileUploadSectionProps {
  projectId: string;
}

interface UploadedFile extends FileMetadata {
  type: "specification" | "rtl";
  progress: number;
  error?: string;
}

// File format validation
const SPEC_FORMATS = [".pdf", ".docx", ".md", ".txt"];
const RTL_FORMATS = [".sv", ".v"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

const FileUploadSection: React.FC<FileUploadSectionProps> = ({
  projectId,
}) => {
  const [specFiles, setSpecFiles] = useState<UploadedFile[]>([]);
  const [rtlFiles, setRtlFiles] = useState<UploadedFile[]>([]);
  const [dragOverSpec, setDragOverSpec] = useState(false);
  const [dragOverRtl, setDragOverRtl] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  // Load existing files on mount
  useEffect(() => {
    // TODO: Load existing files from API
    // const loadFiles = async () => {
    //   const project = await getProject(projectId);
    //   setSpecFiles(project.specificationFiles);
    //   setRtlFiles(project.rtlFiles);
    // };
    // loadFiles();
  }, [projectId]);

  const validateFile = (
    file: File,
    type: "specification" | "rtl",
  ): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }

    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const allowedFormats = type === "specification" ? SPEC_FORMATS : RTL_FORMATS;

    if (!allowedFormats.includes(extension)) {
      return `Unsupported file format. Allowed: ${allowedFormats.join(", ")}`;
    }

    return null;
  };

  const handleDragOver = (
    e: React.DragEvent,
    type: "specification" | "rtl",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "specification") {
      setDragOverSpec(true);
    } else {
      setDragOverRtl(true);
    }
  };

  const handleDragLeave = (
    e: React.DragEvent,
    type: "specification" | "rtl",
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "specification") {
      setDragOverSpec(false);
    } else {
      setDragOverRtl(false);
    }
  };

  const handleDrop = (e: React.DragEvent, type: "specification" | "rtl") => {
    e.preventDefault();
    e.stopPropagation();
    if (type === "specification") {
      setDragOverSpec(false);
    } else {
      setDragOverRtl(false);
    }

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files, type);
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "specification" | "rtl",
  ) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files, type);
      // Reset input value to allow re-uploading the same file
      e.target.value = "";
    }
  };

  const handleFileUpload = async (
    files: File[],
    type: "specification" | "rtl",
  ) => {
    // Validate all files first
    const validFiles: File[] = [];
    const errors: Record<string, string> = {};

    files.forEach((file) => {
      const error = validateFile(file, type);
      if (error) {
        errors[file.name] = error;
      } else {
        validFiles.push(file);
      }
    });

    // Update errors state
    setUploadErrors((prev) => ({ ...prev, ...errors }));

    // Clear errors after 5 seconds
    if (Object.keys(errors).length > 0) {
      setTimeout(() => {
        setUploadErrors((prev) => {
          const newErrors = { ...prev };
          Object.keys(errors).forEach((key) => delete newErrors[key]);
          return newErrors;
        });
      }, 5000);
    }

    if (validFiles.length === 0) return;

    // Create temporary file entries with uploading status
    const tempFiles: UploadedFile[] = validFiles.map((file) => ({
      fileId: `temp-${Math.random().toString(36).substring(7)}`,
      filename: file.name,
      size: file.size,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      type,
      status: "uploading" as const,
      progress: 0,
    }));

    // Add to appropriate list
    if (type === "specification") {
      setSpecFiles((prev) => [...prev, ...tempFiles]);
    } else {
      setRtlFiles((prev) => [...prev, ...tempFiles]);
    }

    // Upload files to backend
    try {
      const uploadedMetadata = await uploadFiles(
        projectId,
        validFiles,
        type,
        (progress) => {
          // Update progress for all files being uploaded
          const updateProgress = (files: UploadedFile[]) =>
            files.map((f) =>
              tempFiles.some((tf) => tf.fileId === f.fileId)
                ? { ...f, progress }
                : f,
            );

          if (type === "specification") {
            setSpecFiles(updateProgress);
          } else {
            setRtlFiles(updateProgress);
          }
        },
      );

      // Replace temp files with actual uploaded files
      const uploadedFiles: UploadedFile[] = uploadedMetadata.map((meta) => ({
        ...meta,
        type,
        progress: 100,
      }));

      if (type === "specification") {
        setSpecFiles((prev) => [
          ...prev.filter((f) => !tempFiles.some((tf) => tf.fileId === f.fileId)),
          ...uploadedFiles,
        ]);
      } else {
        setRtlFiles((prev) => [
          ...prev.filter((f) => !tempFiles.some((tf) => tf.fileId === f.fileId)),
          ...uploadedFiles,
        ]);
      }
    } catch (error) {
      console.error("Upload failed:", error);

      // Mark temp files as failed
      const markFailed = (files: UploadedFile[]) =>
        files.map((f) =>
          tempFiles.some((tf) => tf.fileId === f.fileId)
            ? {
                ...f,
                status: "failed" as const,
                error: error instanceof Error ? error.message : "Upload failed",
              }
            : f,
        );

      if (type === "specification") {
        setSpecFiles(markFailed);
      } else {
        setRtlFiles(markFailed);
      }
    }
  };

  const handleRemoveFile = async (
    fileId: string,
    type: "specification" | "rtl",
  ) => {
    try {
      // Don't try to delete temp files from backend
      if (!fileId.startsWith("temp-")) {
        await deleteFile(projectId, fileId);
      }

      // Remove from local state
      if (type === "specification") {
        setSpecFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      } else {
        setRtlFiles((prev) => prev.filter((f) => f.fileId !== fileId));
      }
    } catch (error) {
      console.error("Failed to remove file:", error);
      alert("Failed to remove file. Please try again.");
    }
  };

  const handleRetryUpload = (file: UploadedFile) => {
    // Remove failed file and trigger re-upload
    handleRemoveFile(file.fileId, file.type);
    // Note: User needs to re-select the file manually
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const renderUploadArea = (
    type: "specification" | "rtl",
    dragOver: boolean,
    files: UploadedFile[],
  ) => {
    const acceptedFormats =
      type === "specification" ? SPEC_FORMATS.join(",") : RTL_FORMATS.join(",");
    const title =
      type === "specification"
        ? "Specification Files"
        : "RTL Design Files";
    const description =
      type === "specification"
        ? "PDF, DOCX, MD, or TXT (max 50MB each)"
        : "SystemVerilog (.sv) or Verilog (.v) (max 50MB each)";

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">{title}</h3>
          <div
            onDragOver={(e) => handleDragOver(e, type)}
            onDragLeave={(e) => handleDragLeave(e, type)}
            onDrop={(e) => handleDrop(e, type)}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label
                htmlFor={`file-upload-${type}`}
                className="cursor-pointer text-blue-600 hover:text-blue-500 font-medium"
              >
                Click to upload
              </label>
              <span className="text-gray-600"> or drag and drop</span>
              <input
                id={`file-upload-${type}`}
                type="file"
                className="hidden"
                multiple
                accept={acceptedFormats}
                onChange={(e) => handleFileSelect(e, type)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">{description}</p>
          </div>
        </div>

        {/* Upload Errors */}
        {Object.entries(uploadErrors).length > 0 && (
          <div className="space-y-2">
            {Object.entries(uploadErrors).map(([filename, error]) => (
              <div
                key={filename}
                className="flex items-start space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <svg
                  className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800 truncate">
                    {filename}
                  </p>
                  <p className="text-xs text-red-700 mt-1">{error}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.fileId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <svg
                    className="h-5 w-5 text-gray-400 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  {file.status === "uploading" && (
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-10 text-right">
                        {file.progress}%
                      </span>
                    </div>
                  )}
                  {file.status === "completed" && (
                    <svg
                      className="h-5 w-5 text-green-500"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                  {file.status === "failed" && (
                    <div className="flex items-center space-x-2">
                      <svg
                        className="h-5 w-5 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <button
                        onClick={() => handleRetryUpload(file)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFile(file.fileId, type)}
                  className="ml-4 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove file"
                  disabled={file.status === "uploading"}
                >
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {renderUploadArea("specification", dragOverSpec, specFiles)}
      {renderUploadArea("rtl", dragOverRtl, rtlFiles)}
    </div>
  );
};

export default FileUploadSection;
