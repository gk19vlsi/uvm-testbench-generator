/**
 * Event Visualization Component
 * Displays simulation events with markers, error highlighting, and phase indicators
 */

import React from "react";
import { SimulationEvent, SimulationState } from "../types/simulation";

interface EventVisualizationProps {
  events: SimulationEvent[];
  currentPhase: SimulationState["phase"];
  currentTime: number;
  className?: string;
}

const EventVisualization: React.FC<EventVisualizationProps> = ({
  events,
  currentPhase,
  currentTime,
  className = "",
}) => {
  // Get event icon based on type
  const getEventIcon = (type: SimulationEvent["type"]): JSX.Element => {
    switch (type) {
      case "transaction":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "assertion":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "error":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "phase_change":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // Get event color based on severity
  const getEventColor = (severity: SimulationEvent["severity"]): string => {
    const colors: Record<SimulationEvent["severity"], string> = {
      info: "bg-blue-100 text-blue-800 border-blue-300",
      warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
      error: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[severity];
  };

  // Get phase color
  const getPhaseColor = (phase: SimulationState["phase"]): string => {
    const colors: Record<SimulationState["phase"], string> = {
      reset: "bg-yellow-500",
      stimulus: "bg-blue-500",
      checking: "bg-purple-500",
      complete: "bg-green-500",
    };
    return colors[phase];
  };

  // Get phase label
  const getPhaseLabel = (phase: SimulationState["phase"]): string => {
    const labels: Record<SimulationState["phase"], string> = {
      reset: "Reset Phase",
      stimulus: "Stimulus Phase",
      checking: "Checking Phase",
      complete: "Complete",
    };
    return labels[phase];
  };

  // Filter recent events (last 10)
  const recentEvents = events.slice(-10);

  // Count events by severity
  const errorCount = events.filter((e) => e.severity === "error").length;
  const warningCount = events.filter((e) => e.severity === "warning").length;

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Phase Indicator */}
      <div className="bg-white rounded-lg border border-gray-300 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Current Phase
          </h3>
          <span className="text-xs text-gray-500">
            Time: {currentTime.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getPhaseColor(currentPhase)}`} />
          <span className="text-sm font-medium text-gray-900">
            {getPhaseLabel(currentPhase)}
          </span>
        </div>

        {/* Phase Progress Bar */}
        <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getPhaseColor(currentPhase)}`}
            style={{
              width:
                currentPhase === "reset"
                  ? "25%"
                  : currentPhase === "stimulus"
                    ? "50%"
                    : currentPhase === "checking"
                      ? "75%"
                      : "100%",
            }}
          />
        </div>
      </div>

      {/* Event Summary */}
      <div className="bg-white rounded-lg border border-gray-300 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Event Summary
        </h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {events.length}
            </div>
            <div className="text-xs text-gray-500">Total Events</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {warningCount}
            </div>
            <div className="text-xs text-gray-500">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
            <div className="text-xs text-gray-500">Errors</div>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white rounded-lg border border-gray-300 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Recent Events
        </h3>

        {recentEvents.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            No events yet
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentEvents.map((event, index) => (
              <div
                key={index}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getEventColor(event.severity)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase">
                      {event.type}
                    </span>
                    <span className="text-xs font-mono">
                      {event.time.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{event.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Highlighting */}
      {errorCount > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900">
                Errors Detected
              </h4>
              <p className="text-sm text-red-700 mt-1">
                {errorCount} error{errorCount !== 1 ? "s" : ""} occurred during
                simulation. Review the event timeline for details.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventVisualization;
