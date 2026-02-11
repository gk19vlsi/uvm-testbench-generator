/**
 * Simulation Progress Display Component
 * Shows simulation phase, progress percentage, current time, and console output
 * Requirements: 10.4, 10.5
 * Task: 23.2
 */

import React, { useState, useEffect, useRef } from "react";

export interface SimulationProgress {
  phase: "compiling" | "elaborating" | "simulating" | "complete";
  percentage: number;
  message: string;
  currentTime?: string;
}

export interface SimulationError {
  file: string;
  line: number;
  message: string;
  severity: "error" | "fatal";
}

export interface SimulationWarning {
  file: string;
  line: number;
  message: string;
}

interface SimulationProgressDisplayProps {
  projectId: string;
  jobId: string;
  onComplete?: (vcdFilePath: string) => void;
  onError?: (errors: SimulationError[]) => void;
  onCancel?: () => void;
}

const SimulationProgressDisplay: React.FC<SimulationProgressDisplayProps> = ({
  projectId,
  jobId,
  onComplete,
  onError,
  onCancel,
}) => {
  const [progress, setProgress] = useState<SimulationProgress>({
    phase: "compiling",
    percentage: 0,
    message: "Initializing simulation...",
  });
  const [consoleOutput, setConsoleOutput] = useState<string>("");
  const [errors, setErrors] = useState<SimulationError[]>([]);
  const [warnings, setWarnings] = useState<SimulationWarning[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll console to bottom when new output arrives
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleOutput]);

  // Poll simulation status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/simulate/${jobId}/status`
        );

        if (response.ok) {
          const data = await response.json();

          // Update progress
          if (data.progress) {
            setProgress(data.progress);
          }

          // Update console output
          if (data.consoleOutput) {
            setConsoleOutput(data.consoleOutput);
          }

          // Update errors and warnings
          if (data.errors) {
            setErrors(data.errors);
          }
          if (data.warnings) {
            setWarnings(data.warnings);
          }

          // Check if complete
          if (data.status === "complete") {
            setIsComplete(true);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }

            // Notify parent if VCD file is available
            if (data.vcdFilePath && onComplete) {
              onComplete(data.vcdFilePath);
            }
          }

          // Check if failed
          if (data.status === "failed") {
            setIsFailed(true);
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
            }

            // Notify parent of errors
            if (data.errors && onError) {
              onError(data.errors);
            }
          }
        }
      } catch (error) {
        console.error("Error polling simulation status:", error);
      }
    };

    // Start polling
    pollStatus(); // Initial poll
    pollIntervalRef.current = setInterval(pollStatus, 1000); // Poll every second

    // Cleanup on unmount
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [projectId, jobId, onComplete, onError]);

  // Handle cancel simulation
  const handleCancel = async () => {
    if (isCanceling) return;

    setIsCanceling(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/simulate/${jobId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }

        if (onCancel) {
          onCancel();
        }
      }
    } catch (error) {
      console.error("Error canceling simulation:", error);
    } finally {
      setIsCanceling(false);
    }
  };

  // Get phase display info
  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case "compiling":
        return {
          label: "Compiling",
          icon: "⚙️",
          color: "text-blue-600",
          bgColor: "bg-blue-50",
        };
      case "elaborating":
        return {
          label: "Elaborating",
          icon: "🔧",
          color: "text-purple-600",
          bgColor: "bg-purple-50",
        };
      case "simulating":
        return {
          label: "Simulating",
          icon: "▶️",
          color: "text-green-600",
          bgColor: "bg-green-50",
        };
      case "complete":
        return {
          label: "Complete",
          icon: "✅",
          color: "text-green-600",
          bgColor: "bg-green-50",
        };
      default:
        return {
          label: "Unknown",
          icon: "❓",
          color: "text-gray-600",
          bgColor: "bg-gray-50",
        };
    }
  };

  const phaseInfo = getPhaseInfo(progress.phase);

  return (
    <div className="space-y-4">
      {/* Phase and Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{phaseInfo.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {phaseInfo.label}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {progress.message}
              </p>
            </div>
          </div>

          {/* Current Simulation Time */}
          {progress.currentTime && (
            <div className="text-right">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Simulation Time
              </div>
              <div className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100">
                {progress.currentTime}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {progress.percentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                isFailed
                  ? "bg-red-500"
                  : isComplete
                    ? "bg-green-500"
                    : "bg-blue-500"
              }`}
              style={{ width: `${progress.percentage}%` }}
            >
              {!isComplete && !isFailed && (
                <div className="h-full w-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
              )}
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-4">
            {errors.length > 0 && (
              <div className="flex items-center space-x-1 text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">{errors.length} Error{errors.length !== 1 ? "s" : ""}</span>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="flex items-center space-x-1 text-yellow-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm font-medium">{warnings.length} Warning{warnings.length !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* Cancel Button */}
          {!isComplete && !isFailed && (
            <button
              onClick={handleCancel}
              disabled={isCanceling}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCanceling ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                  Canceling...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Cancel Simulation
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Console Output */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Console Output
          </h4>
        </div>
        <div
          ref={consoleRef}
          className="p-4 bg-gray-900 text-gray-100 font-mono text-xs overflow-auto max-h-96"
          style={{ minHeight: "200px" }}
        >
          {consoleOutput ? (
            <pre className="whitespace-pre-wrap break-words">{consoleOutput}</pre>
          ) : (
            <div className="text-gray-500 italic">Waiting for output...</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimulationProgressDisplay;
