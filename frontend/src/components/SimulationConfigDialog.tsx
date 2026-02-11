/**
 * Simulation Configuration Dialog Component
 * Allows users to configure and trigger simulation runs
 * Requirements: 10.1, 10.6
 */

import React, { useState, useEffect } from "react";

export type SimulatorType =
  | "modelsim"
  | "vcs"
  | "xcelium"
  | "verilator"
  | "icarus";

interface SimulatorInfo {
  type: SimulatorType;
  available: boolean;
  version?: string;
  executable?: string;
}

interface SimulationConfigDialogProps {
  projectId: string;
  generationId: string;
  onClose: () => void;
  onSimulationStart: (jobId: string) => void;
}

const SimulationConfigDialog: React.FC<SimulationConfigDialogProps> = ({
  projectId,
  generationId,
  onClose,
  onSimulationStart,
}) => {
  const [availableSimulators, setAvailableSimulators] = useState<
    SimulatorInfo[]
  >([]);
  const [selectedSimulator, setSelectedSimulator] =
    useState<SimulatorType | null>(null);
  const [runtime, setRuntime] = useState<string>("1000ns");
  const [timescale, setTimescale] = useState<string>("1ns/1ps");
  const [plusargs, setPlusargs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const simulatorDescriptions: Record<
    SimulatorType,
    { name: string; description: string }
  > = {
    modelsim: {
      name: "ModelSim",
      description: "Mentor Graphics ModelSim simulator",
    },
    vcs: {
      name: "VCS",
      description: "Synopsys VCS simulator",
    },
    xcelium: {
      name: "Xcelium",
      description: "Cadence Xcelium simulator",
    },
    verilator: {
      name: "Verilator",
      description: "Open-source Verilog simulator",
    },
    icarus: {
      name: "Icarus Verilog",
      description: "Open-source Verilog simulator",
    },
  };

  // Load available simulators on mount
  useEffect(() => {
    loadAvailableSimulators();
  }, []);

  const loadAvailableSimulators = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/simulators");
      if (response.ok) {
        const data = await response.json();
        setAvailableSimulators(data.simulators || []);

        // Auto-select first available simulator
        const firstAvailable = data.simulators?.find(
          (sim: SimulatorInfo) => sim.available,
        );
        if (firstAvailable) {
          setSelectedSimulator(firstAvailable.type);
        } else {
          setError(
            "No simulators detected. Please install a supported simulator (ModelSim, VCS, Xcelium, Verilator, or Icarus Verilog).",
          );
        }
      } else {
        setError("Failed to load simulator information");
      }
    } catch (err: any) {
      console.error("Failed to load simulators:", err);
      setError("Failed to connect to backend. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSimulation = async () => {
    if (!selectedSimulator) {
      setError("Please select a simulator");
      return;
    }

    // Validate inputs
    if (!runtime.trim()) {
      setError("Please specify simulation runtime");
      return;
    }

    if (!timescale.trim()) {
      setError("Please specify timescale");
      return;
    }

    setIsStarting(true);
    setError(null);

    try {
      // Parse plusargs into array
      const plusargsArray = plusargs
        .split(",")
        .map((arg) => arg.trim())
        .filter((arg) => arg.length > 0);

      const config = {
        simulator: selectedSimulator,
        projectId,
        generationId,
        runtime: runtime.trim(),
        timescale: timescale.trim(),
        plusargs: plusargsArray,
      };

      const response = await fetch(
        `/api/projects/${projectId}/simulate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(config),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const jobId = data.jobId || generationId;

        // Notify parent component
        onSimulationStart(jobId);

        // Close dialog
        onClose();
      } else {
        const errorData = await response.json();
        // Handle detailed error with suggestions
        let errorMessage = errorData.error || errorData.message || "Failed to start simulation. Please try again.";
        
        if (errorData.details) {
          errorMessage += `\n\n${errorData.details}`;
        }
        
        if (errorData.suggestions && errorData.suggestions.length > 0) {
          errorMessage += `\n\nSuggestions:\n${errorData.suggestions.map((s: string) => `• ${s}`).join("\n")}`;
        }
        
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error("Failed to start simulation:", err);
      setError(
        err.message || "Failed to start simulation. Please try again.",
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Simulation Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure and run HDL simulation
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isStarting}
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Simulator Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Simulator
                </label>
                <div className="space-y-3">
                  {availableSimulators.map((simulator) => (
                    <label
                      key={simulator.type}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedSimulator === simulator.type
                          ? "border-blue-500 bg-blue-50"
                          : simulator.available
                            ? "border-gray-300 hover:border-gray-400"
                            : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="simulator"
                        value={simulator.type}
                        checked={selectedSimulator === simulator.type}
                        onChange={(e) =>
                          setSelectedSimulator(e.target.value as SimulatorType)
                        }
                        disabled={!simulator.available}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">
                            {simulatorDescriptions[simulator.type]?.name ||
                              simulator.type}
                          </div>
                          <div className="flex items-center space-x-2">
                            {simulator.available ? (
                              <>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  Available
                                </span>
                                {simulator.version && (
                                  <span className="text-xs text-gray-500">
                                    v{simulator.version}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                Not Installed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {simulatorDescriptions[simulator.type]?.description ||
                            "HDL simulator"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Simulation Parameters */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  Simulation Parameters
                </h3>

                <div className="space-y-4">
                  {/* Runtime */}
                  <div>
                    <label
                      htmlFor="runtime"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Runtime
                    </label>
                    <input
                      type="text"
                      id="runtime"
                      value={runtime}
                      onChange={(e) => setRuntime(e.target.value)}
                      placeholder="e.g., 1000ns, 10us, 1ms"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Specify simulation duration (e.g., 1000ns, 10us, 1ms)
                    </p>
                  </div>

                  {/* Timescale */}
                  <div>
                    <label
                      htmlFor="timescale"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Timescale
                    </label>
                    <input
                      type="text"
                      id="timescale"
                      value={timescale}
                      onChange={(e) => setTimescale(e.target.value)}
                      placeholder="e.g., 1ns/1ps"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Time unit / time precision (e.g., 1ns/1ps)
                    </p>
                  </div>

                  {/* Plusargs */}
                  <div>
                    <label
                      htmlFor="plusargs"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Plusargs (Optional)
                    </label>
                    <input
                      type="text"
                      id="plusargs"
                      value={plusargs}
                      onChange={(e) => setPlusargs(e.target.value)}
                      placeholder="e.g., UVM_TESTNAME=my_test, UVM_VERBOSITY=UVM_HIGH"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated simulator arguments (e.g.,
                      UVM_TESTNAME=my_test, UVM_VERBOSITY=UVM_HIGH)
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900">
                      Simulation Output
                    </h4>
                    <p className="text-sm text-blue-800 mt-1">
                      The simulation will generate a VCD (Value Change Dump)
                      file that can be visualized in the waveform viewer. You
                      can monitor simulation progress in real-time.
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
                      <p className="text-sm font-medium text-red-800">Error</p>
                      <p className="text-sm text-red-700 mt-1 whitespace-pre-line">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isStarting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleStartSimulation}
              disabled={
                isStarting || !selectedSimulator || isLoading
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isStarting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Starting Simulation...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Start Simulation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationConfigDialog;
