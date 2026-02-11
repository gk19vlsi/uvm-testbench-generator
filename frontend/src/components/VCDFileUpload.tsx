/**
 * VCD File Upload Component
 * Handles VCD (Value Change Dump) file uploads with drag-and-drop support
 * Shows upload progress for large files and integrates with VCD parser
 * Requirements: 9.1
 */

import { useState, useCallback } from "react";
import { VCDParser } from "../services/VCDParser";
import type { VCDData, VCDParseProgress, VCDParseError } from "../types/vcd";

interface VCDFileUploadProps {
  onVCDParsed: (vcdData: VCDData, filename: string) => void;
  onError?: (error: string) => void;
}

interface UploadState {
  status: "idle" | "uploading" | "parsing" | "completed" | "error";
  filename: string;
  fileSize: number;
  progress: number;
  parsePhase?: VCDParseProgress["phase"];
  error?: string;
  parseErrors?: VCDParseError[];
  parseWarnings?: VCDParseError[];
}

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for VCD files
const ACCEPTED_EXTENSIONS = [".vcd"];

const VCDFileUpload: React.FC<VCDFileUploadProps> = ({
  onVCDParsed,
  onError,
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    filename: "",
    fileSize: 0,
    progress: 0,
  });
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 500MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    }

    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `Unsupported file format. Expected: ${ACCEPTED_EXTENSIONS.join(", ")}`;
    }

    return null;
  };

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        setUploadState({
          status: "error",
          filename: file.name,
          fileSize: file.size,
          progress: 0,
          error: validationError,
        });
        onError?.(validationError);
        return;
      }

      // Set uploading state
      setUploadState({
        status: "uploading",
        filename: file.name,
        fileSize: file.size,
        progress: 0,
      });

      try {
        // Create VCD parser
        const parser = new VCDParser();

        // Set up progress callback
        parser.setProgressCallback((progress: VCDParseProgress) => {
          setUploadState((prev) => ({
            ...prev,
            status: "parsing",
            progress: progress.percentage,
            parsePhase: progress.phase,
          }));
        });

        // Parse VCD file
        const vcdData = await parser.parseFile(file);

        // Set completed state
        setUploadState({
          status: "completed",
          filename: file.name,
          fileSize: file.size,
          progress: 100,
        });

        // Notify parent component
        onVCDParsed(vcdData, file.name);
      } catch (error) {
        // Try to get validation result for detailed errors
        let parseErrors: VCDParseError[] = [];
        let parseWarnings: VCDParseError[] = [];
        
        try {
          const parser = new VCDParser();
          const text = await file.text();
          const validationResult = parser.validate(text);
          parseErrors = validationResult.errors;
          parseWarnings = validationResult.warnings;
        } catch (validationError) {
          // Validation also failed, use generic error
        }

        const errorMessage =
          error instanceof Error ? error.message : "Failed to parse VCD file";
        setUploadState({
          status: "error",
          filename: file.name,
          fileSize: file.size,
          progress: 0,
          error: errorMessage,
          parseErrors,
          parseWarnings,
        });
        onError?.(errorMessage);
      }
    },
    [onVCDParsed, onError],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]); // Only handle first file
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
      // Reset input value to allow re-uploading the same file
      e.target.value = "";
    }
  };

  const handleReset = () => {
    setUploadState({
      status: "idle",
      filename: "",
      fileSize: 0,
      progress: 0,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getPhaseLabel = (phase?: VCDParseProgress["phase"]): string => {
    switch (phase) {
      case "header":
        return "Parsing header...";
      case "definitions":
        return "Parsing signal definitions...";
      case "values":
        return "Parsing value changes...";
      case "complete":
        return "Complete";
      default:
        return "Processing...";
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          VCD File Upload
        </h3>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragOver
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${uploadState.status === "uploading" || uploadState.status === "parsing" ? "opacity-50 pointer-events-none" : ""}`}
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
              htmlFor="vcd-file-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-500 font-medium"
            >
              Click to upload
            </label>
            <span className="text-gray-600"> or drag and drop</span>
            <input
              id="vcd-file-upload"
              type="file"
              className="hidden"
              accept=".vcd"
              onChange={handleFileSelect}
              disabled={
                uploadState.status === "uploading" ||
                uploadState.status === "parsing"
              }
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            VCD files from simulation tools (max 500MB)
          </p>
        </div>
      </div>

      {/* Upload Status */}
      {uploadState.status !== "idle" && (
        <div className="space-y-2">
          <div
            className={`p-4 rounded-lg border ${
              uploadState.status === "error"
                ? "bg-red-50 border-red-200"
                : uploadState.status === "completed"
                  ? "bg-green-50 border-green-200"
                  : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-start space-x-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {uploadState.status === "error" && (
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
                )}
                {uploadState.status === "completed" && (
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
                {(uploadState.status === "uploading" ||
                  uploadState.status === "parsing") && (
                  <svg
                    className="animate-spin h-5 w-5 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    uploadState.status === "error"
                      ? "text-red-800"
                      : uploadState.status === "completed"
                        ? "text-green-800"
                        : "text-blue-800"
                  }`}
                >
                  {uploadState.filename}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    uploadState.status === "error"
                      ? "text-red-700"
                      : uploadState.status === "completed"
                        ? "text-green-700"
                        : "text-blue-700"
                  }`}
                >
                  {formatFileSize(uploadState.fileSize)}
                </p>

                {/* Progress bar for uploading/parsing */}
                {(uploadState.status === "uploading" ||
                  uploadState.status === "parsing") && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-blue-700">
                      <span>{getPhaseLabel(uploadState.parsePhase)}</span>
                      <span>{Math.round(uploadState.progress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadState.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {uploadState.status === "error" && uploadState.error && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-red-700 font-medium">
                      {uploadState.error}
                    </p>
                    
                    {/* Detailed parse errors */}
                    {uploadState.parseErrors && uploadState.parseErrors.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-red-800">
                          Parse Errors ({uploadState.parseErrors.length}):
                        </p>
                        <div className="max-h-48 overflow-y-auto space-y-2 bg-red-100 dark:bg-red-900/20 rounded p-2">
                          {uploadState.parseErrors.slice(0, 10).map((err, idx) => (
                            <div key={idx} className="text-xs space-y-1">
                              <div className="flex items-start space-x-2">
                                <span className="flex-shrink-0 font-mono text-red-600 dark:text-red-400">
                                  Line {err.line}:
                                </span>
                                <span className="text-red-800 dark:text-red-200">
                                  {err.message}
                                </span>
                              </div>
                              {err.suggestion && (
                                <div className="ml-14 text-red-700 dark:text-red-300 italic">
                                  💡 {err.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                          {uploadState.parseErrors.length > 10 && (
                            <p className="text-xs text-red-600 dark:text-red-400 italic">
                              ... and {uploadState.parseErrors.length - 10} more error(s)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Parse warnings */}
                    {uploadState.parseWarnings && uploadState.parseWarnings.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                          Warnings ({uploadState.parseWarnings.length}):
                        </p>
                        <div className="max-h-32 overflow-y-auto space-y-2 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                          {uploadState.parseWarnings.slice(0, 5).map((warn, idx) => (
                            <div key={idx} className="text-xs space-y-1">
                              <div className="flex items-start space-x-2">
                                <span className="flex-shrink-0 font-mono text-yellow-600 dark:text-yellow-400">
                                  Line {warn.line}:
                                </span>
                                <span className="text-yellow-800 dark:text-yellow-200">
                                  {warn.message}
                                </span>
                              </div>
                              {warn.suggestion && (
                                <div className="ml-14 text-yellow-700 dark:text-yellow-300 italic">
                                  💡 {warn.suggestion}
                                </div>
                              )}
                            </div>
                          ))}
                          {uploadState.parseWarnings.length > 5 && (
                            <p className="text-xs text-yellow-600 dark:text-yellow-400 italic">
                              ... and {uploadState.parseWarnings.length - 5} more warning(s)
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Common VCD format issues help */}
                    {uploadState.parseErrors && uploadState.parseErrors.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                          Common VCD Format Issues:
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                          <li>Missing $enddefinitions $end marker</li>
                          <li>Unterminated sections (missing $end)</li>
                          <li>Invalid timescale format (use: $timescale 1ns $end)</li>
                          <li>Malformed $var declarations</li>
                          <li>Invalid timestamp format (use: #0, #10, etc.)</li>
                          <li>Incorrect value change format</li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Success message */}
                {uploadState.status === "completed" && (
                  <p className="text-xs text-green-700 mt-2">
                    VCD file parsed successfully
                  </p>
                )}
              </div>

              {/* Action button */}
              {(uploadState.status === "error" ||
                uploadState.status === "completed") && (
                <button
                  onClick={handleReset}
                  className={`flex-shrink-0 text-xs font-medium ${
                    uploadState.status === "error"
                      ? "text-red-600 hover:text-red-700"
                      : "text-green-600 hover:text-green-700"
                  }`}
                >
                  {uploadState.status === "error" ? "Try Again" : "Upload New"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VCDFileUpload;
