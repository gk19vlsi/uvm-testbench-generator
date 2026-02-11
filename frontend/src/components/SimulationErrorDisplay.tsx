/**
 * Simulation Error Display Component
 * Displays compilation and runtime errors with file names, line numbers, and links
 * Requirements: 10.7
 * Task: 23.4
 */

import React, { useState } from "react";

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

interface SimulationErrorDisplayProps {
  errors: SimulationError[];
  warnings: SimulationWarning[];
  onErrorClick?: (file: string, line: number) => void;
  className?: string;
}

const SimulationErrorDisplay: React.FC<SimulationErrorDisplayProps> = ({
  errors,
  warnings,
  onErrorClick,
  className = "",
}) => {
  const [showWarnings, setShowWarnings] = useState(true);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const toggleErrorExpanded = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const handleErrorClick = (file: string, line: number) => {
    if (onErrorClick) {
      onErrorClick(file, line);
    }
  };

  const getSeverityColor = (severity: "error" | "fatal") => {
    return severity === "fatal"
      ? "text-red-700 bg-red-100 border-red-300"
      : "text-red-600 bg-red-50 border-red-200";
  };

  const getSeverityIcon = (severity: "error" | "fatal") => {
    return severity === "fatal" ? "🔴" : "❌";
  };

  if (errors.length === 0 && warnings.length === 0) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              No Errors or Warnings
            </h3>
            <p className="text-sm text-green-700 mt-1">
              Simulation completed successfully without any issues.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
                  Compilation & Runtime Errors
                </h3>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                {errors.length} Error{errors.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {errors.map((error, index) => (
              <div
                key={index}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {getSeverityIcon(error.severity)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {/* Error Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(error.severity)}`}
                          >
                            {error.severity.toUpperCase()}
                          </span>
                          {error.file && (
                            <button
                              onClick={() => handleErrorClick(error.file, error.line)}
                              className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono"
                              title="Click to open in editor"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              <span>{error.file}</span>
                              {error.line > 0 && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  :{error.line}
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Error Message */}
                        <div className="text-sm text-gray-900 dark:text-gray-100">
                          {error.message.length > 150 && !expandedErrors.has(index) ? (
                            <>
                              <p className="break-words">
                                {error.message.substring(0, 150)}...
                              </p>
                              <button
                                onClick={() => toggleErrorExpanded(index)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs mt-1"
                              >
                                Show more
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="break-words">{error.message}</p>
                              {error.message.length > 150 && (
                                <button
                                  onClick={() => toggleErrorExpanded(index)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs mt-1"
                                >
                                  Show less
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings Section */}
      {warnings.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  Warnings
                </h3>
              </div>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                  {warnings.length} Warning{warnings.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setShowWarnings(!showWarnings)}
                  className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  <svg
                    className={`w-5 h-5 transform transition-transform ${showWarnings ? "rotate-180" : ""}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {showWarnings && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-xl flex-shrink-0 mt-0.5">⚠️</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {warning.file && (
                          <button
                            onClick={() => handleErrorClick(warning.file, warning.line)}
                            className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-mono"
                            title="Click to open in editor"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                            <span>{warning.file}</span>
                            {warning.line > 0 && (
                              <span className="text-gray-500 dark:text-gray-400">
                                :{warning.line}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 break-words">
                        {warning.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SimulationErrorDisplay;
