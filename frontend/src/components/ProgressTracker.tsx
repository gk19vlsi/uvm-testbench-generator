/**
 * Progress Tracker Component
 * Real-time progress updates via WebSocket
 * Displays agent execution status and progress feed
 */

import { useEffect, useRef, useState } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import type { ProgressUpdate, ErrorPayload, CompletePayload } from "../services/websocket";

interface ProgressTrackerProps {
  projectId: string;
  generationId: string | null; // Reserved for future use
  onComplete: () => void;
  onFailed: () => void;
}

interface DisplayUpdate {
  id: string;
  timestamp: string;
  agentName: string;
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
  details?: Record<string, any>;
  severity?: "warning" | "error" | "critical" | "info";
  isError?: boolean;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  projectId,
  // generationId - Reserved for future use to track specific generation
  onComplete,
  onFailed,
}) => {
  const [updates, setUpdates] = useState<DisplayUpdate[]>([]);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const scrollRef = useRef<HTMLDivElement>(null);

  // WebSocket connection with handlers
  const { isConnected } = useWebSocket(projectId, {
    onProgress: (update: ProgressUpdate) => {
      const displayUpdate: DisplayUpdate = {
        id: `${Date.now()}-${Math.random()}`,
        ...update,
        isError: false,
      };
      
      setUpdates((prev) => [...prev, displayUpdate]);
      
      if (update.status === "started") {
        setCurrentAgent(update.agentName);
      } else if (update.status === "completed") {
        // Check if this was the last agent
        const agentOrder = [
          "Specification Agent",
          "RTL Agent",
          "Alignment Agent",
          "Architecture Agent",
          "Generator Agent",
          "Sequence Agent",
          "Validation Agent",
        ];
        const currentIndex = agentOrder.indexOf(update.agentName);
        if (currentIndex === agentOrder.length - 1) {
          setCurrentAgent(null);
        }
      }
    },
    onError: (error: ErrorPayload) => {
      const displayUpdate: DisplayUpdate = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: error.timestamp,
        agentName: error.agentName,
        status: "failed",
        message: error.message,
        details: error.details ? { details: error.details } : undefined,
        severity: error.severity,
        isError: true,
      };
      
      setUpdates((prev) => [...prev, displayUpdate]);
      
      if (error.severity === "critical" && !error.recoverable) {
        setCurrentAgent(null);
        onFailed();
      }
    },
    onComplete: (complete: CompletePayload) => {
      const displayUpdate: DisplayUpdate = {
        id: `${Date.now()}-${Math.random()}`,
        timestamp: complete.timestamp,
        agentName: "Pipeline",
        status: "completed",
        message: complete.message,
        details: {
          generatedFiles: complete.generatedFiles,
          readinessScore: complete.readinessScore?.overall,
        },
        isError: false,
      };
      
      setUpdates((prev) => [...prev, displayUpdate]);
      setCurrentAgent(null);
      
      if (complete.success) {
        onComplete();
      } else {
        onFailed();
      }
    },
    onConnect: () => {
      setConnectionStatus("connected");
    },
    onDisconnect: () => {
      setConnectionStatus("disconnected");
    },
  });

  // Update connection status based on isConnected
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus("connected");
    } else if (connectionStatus === "connected") {
      setConnectionStatus("disconnected");
    }
  }, [isConnected, connectionStatus]);

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [updates]);

  const getStatusIcon = (status: string, isError?: boolean, severity?: string) => {
    if (isError) {
      if (severity === "critical") {
        return (
          <svg
            className="h-5 w-5 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      } else if (severity === "warning") {
        return (
          <svg
            className="h-5 w-5 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      }
    }

    switch (status) {
      case "started":
        return (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        );
      case "in_progress":
        return (
          <div className="animate-pulse rounded-full h-5 w-5 bg-blue-500"></div>
        );
      case "completed":
        return (
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
        );
      case "failed":
        return (
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
        );
      default:
        return null;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getUpdateBackgroundColor = (update: DisplayUpdate) => {
    if (update.isError) {
      if (update.severity === "critical") return "bg-red-50 border-l-4 border-red-500";
      if (update.severity === "warning") return "bg-yellow-50 border-l-4 border-yellow-500";
      return "bg-orange-50 border-l-4 border-orange-500";
    }
    return "bg-white";
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      {connectionStatus !== "connected" && (
        <div className={`rounded-lg p-3 text-sm ${
          connectionStatus === "connecting"
            ? "bg-blue-50 text-blue-700"
            : "bg-red-50 text-red-700"
        }`}>
          <div className="flex items-center space-x-2">
            {connectionStatus === "connecting" ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Connecting to server...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Disconnected from server. Attempting to reconnect...</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Current Agent Status */}
      {currentAgent && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <div>
              <p className="text-sm font-medium text-blue-900">
                Currently Processing
              </p>
              <p className="text-sm text-blue-700">{currentAgent}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Feed */}
      <div
        ref={scrollRef}
        className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-3"
      >
        {updates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">
              {connectionStatus === "connected"
                ? "Waiting for updates..."
                : "Connecting to server..."}
            </p>
          </div>
        ) : (
          updates.map((update) => (
            <div
              key={update.id}
              className={`flex items-start space-x-3 rounded-lg p-3 shadow-sm ${getUpdateBackgroundColor(update)}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(update.status, update.isError, update.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${
                    update.isError ? "text-red-900" : "text-gray-900"
                  }`}>
                    {update.agentName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(update.timestamp)}
                  </p>
                </div>
                <p className={`text-sm mt-1 ${
                  update.isError ? "text-red-700" : "text-gray-600"
                }`}>
                  {update.message}
                </p>
                {update.details && Object.keys(update.details).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500 space-y-1">
                    {Object.entries(update.details).map(([key, value]) => (
                      <div key={key} className="flex items-start">
                        <span className="font-medium mr-2">{key}:</span>
                        <span className="break-words">
                          {typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Progress Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {updates.filter((u) => u.status === "completed" && !u.isError).length} of 7 agents
          completed
        </span>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"
          }`}></div>
          <span className="text-xs text-gray-500">
            {connectionStatus === "connected" ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;
