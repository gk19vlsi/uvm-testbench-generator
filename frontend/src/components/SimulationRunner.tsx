/**
 * Simulation Runner Component
 * Integrates simulation progress, automatic VCD visualization, and error display
 * Requirements: 10.3, 10.4, 10.5, 10.7
 * Tasks: 23.2, 23.3, 23.4
 */

import React, { useState } from "react";
import SimulationConfigDialog from "./SimulationConfigDialog";
import SimulationProgressDisplay, {
  SimulationError,
} from "./SimulationProgressDisplay";
import SimulationErrorDisplay from "./SimulationErrorDisplay";
import { VCDParser } from "../services/VCDParser";
import { VCDData } from "../types/vcd";
import { Signal, SignalData } from "../types/simulation";

interface SimulationRunnerProps {
  projectId: string;
  generationId: string;
  onVCDLoaded?: (vcdData: VCDData, signals: Signal[], signalData: SignalData[]) => void;
  onSimulationComplete?: () => void;
  className?: string;
}

type SimulationState = "idle" | "configuring" | "running" | "complete" | "failed";

const SimulationRunner: React.FC<SimulationRunnerProps> = ({
  projectId,
  generationId,
  onVCDLoaded,
  onSimulationComplete,
  className = "",
}) => {
  const [state, setState] = useState<SimulationState>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [errors, setErrors] = useState<SimulationError[]>([]);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [vcdFilePath, setVcdFilePath] = useState<string | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);

  // Handle simulation start
  const handleSimulationStart = (newJobId: string) => {
    setJobId(newJobId);
    setState("running");
    setErrors([]);
    setWarnings([]);
    setVcdFilePath(null);
    setShowSuccessNotification(false);
  };

  // Handle simulation complete
  const handleSimulationComplete = async (vcdPath: string) => {
    setState("complete");
    setVcdFilePath(vcdPath);
    setShowSuccessNotification(true);

    // Automatically load and parse VCD file
    try {
      // Fetch VCD file content
      const response = await fetch(
        `/api/projects/${projectId}/simulate/${jobId}/vcd`
      );

      if (response.ok) {
        const vcdContent = await response.text();

        // Parse VCD file
        const parser = new VCDParser();
        const parsedVcdData = parser.parse(vcdContent);

        // Convert to visualization format
        const waveforms = parser.convertToWaveform(parsedVcdData);

        // Convert to Signal[] format
        const convertedSignals: Signal[] = [];
        parsedVcdData.signals.forEach((vcdSignal) => {
          convertedSignals.push({
            id: vcdSignal.name,
            name: vcdSignal.name,
            type: vcdSignal.type === "wire" || vcdSignal.type === "reg" ? "data" : "control",
            color: getSignalColor(vcdSignal.type),
            bitWidth: vcdSignal.bitWidth,
          });
        });

        // Convert to SignalData[] format
        const convertedSignalData: SignalData[] = [];
        waveforms.forEach((timeSeries, signalName) => {
          convertedSignalData.push({
            signalId: signalName,
            transitions: timeSeries.transitions,
          });
        });

        // Notify parent component
        if (onVCDLoaded) {
          onVCDLoaded(parsedVcdData, convertedSignals, convertedSignalData);
        }

        console.log("[Simulation] Automatically loaded VCD with", convertedSignals.length, "signals");
      }
    } catch (error) {
      console.error("[Simulation] Error loading VCD file:", error);
    }

    // Hide success notification after 5 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 5000);

    if (onSimulationComplete) {
      onSimulationComplete();
    }
  };

  // Handle simulation error
  const handleSimulationError = (simulationErrors: SimulationError[]) => {
    setState("failed");
    setErrors(simulationErrors);
  };

  // Handle simulation cancel
  const handleSimulationCancel = () => {
    setState("idle");
    setJobId(null);
  };

  // Handle error click (open in editor)
  const handleErrorClick = (file: string, line: number) => {
    // TODO: Implement editor navigation
    console.log("[Simulation] Navigate to", file, "line", line);
  };

  // Get signal color based on type
  const getSignalColor = (type: string): string => {
    switch (type) {
      case "wire":
      case "reg":
        return "#3b82f6"; // blue for data signals
      case "integer":
        return "#8b5cf6"; // purple for integers
      case "real":
        return "#ec4899"; // pink for real numbers
      default:
        return "#6b7280"; // gray for others
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Start Simulation Button */}
      {state === "idle" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Run Simulation
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Execute HDL simulation and visualize waveforms
              </p>
            </div>
            <button
              onClick={() => setState("configuring")}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              Start Simulation
            </button>
          </div>
        </div>
      )}

      {/* Configuration Dialog */}
      {state === "configuring" && (
        <SimulationConfigDialog
          projectId={projectId}
          generationId={generationId}
          onClose={() => setState("idle")}
          onSimulationStart={handleSimulationStart}
        />
      )}

      {/* Progress Display */}
      {state === "running" && jobId && (
        <SimulationProgressDisplay
          projectId={projectId}
          jobId={jobId}
          onComplete={handleSimulationComplete}
          onError={handleSimulationError}
          onCancel={handleSimulationCancel}
        />
      )}

      {/* Success Notification */}
      {showSuccessNotification && state === "complete" && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">
                Simulation Complete!
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                VCD file has been automatically loaded and waveforms are now available for visualization.
                {vcdFilePath && (
                  <span className="block mt-1 font-mono text-xs">
                    {vcdFilePath}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessNotification(false)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {(state === "complete" || state === "failed") && (errors.length > 0 || warnings.length > 0) && (
        <SimulationErrorDisplay
          errors={errors}
          warnings={warnings}
          onErrorClick={handleErrorClick}
        />
      )}

      {/* Restart Button */}
      {(state === "complete" || state === "failed") && (
        <div className="flex justify-end">
          <button
            onClick={() => setState("configuring")}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700 dark:hover:bg-blue-800"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            Run Another Simulation
          </button>
        </div>
      )}
    </div>
  );
};

export default SimulationRunner;
