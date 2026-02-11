/**
 * Generation Controls Component
 * Mode selection and generate button
 */

import { useState, useEffect as React_useEffect } from "react";
import * as React from "react";

interface GenerationControlsProps {
  projectId: string;
  onGenerationStart: (generationId: string) => void;
  disabled?: boolean;
  generationStatus?: "idle" | "generating" | "completed" | "failed";
}

type GenerationMode = "mvp" | "production" | "advanced";

const GenerationControls: React.FC<GenerationControlsProps> = ({
  projectId,
  onGenerationStart,
  disabled = false,
  generationStatus = "idle",
}) => {
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("production");
  const [isGenerating, setIsGenerating] = useState(false);

  // Update isGenerating based on generationStatus
  React.useEffect(() => {
    setIsGenerating(generationStatus === "generating");
  }, [generationStatus]);

  const modes = [
    {
      id: "mvp" as GenerationMode,
      name: "MVP",
      description: "Single agent, basic driver/monitor, one test and sequence",
      features: [
        "Single agent testbench",
        "Basic driver and monitor",
        "One test and sequence",
        "Quick generation",
      ],
    },
    {
      id: "production" as GenerationMode,
      name: "Production",
      description: "Multi-agent, scoreboard, randomization, and coverage",
      features: [
        "Multi-agent architecture",
        "Scoreboard for checking",
        "Constrained randomization",
        "Coverage hooks",
        "Multiple tests",
      ],
      recommended: true,
    },
    {
      id: "advanced" as GenerationMode,
      name: "Advanced",
      description: "Protocol auto-detection and multi-DUT support",
      features: [
        "All Production features",
        "Protocol auto-detection",
        "Multi-DUT support",
        "Advanced sequences",
        "Comprehensive coverage",
      ],
    },
  ];

  const handleGenerate = async () => {
    if (disabled || isGenerating) return;

    setIsGenerating(true);

    try {
      // Call actual API endpoint
      const response = await fetch(`/api/projects/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: selectedMode })
      });
      
      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      onGenerationStart(data.generationId);
    } catch (error) {
      console.error("Failed to start generation:", error);
      alert(`Failed to start generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Generation Mode
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              disabled={disabled}
              className={`relative p-3 sm:p-4 border-2 rounded-lg text-left transition-all ${
                selectedMode === mode.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {mode.recommended && (
                <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Recommended
                </span>
              )}
              <div className="flex items-center space-x-2 mb-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedMode === mode.id
                      ? "border-blue-500"
                      : "border-gray-300"
                  }`}
                >
                  {selectedMode === mode.id && (
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm sm:text-base">{mode.name}</h4>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{mode.description}</p>
              <ul className="space-y-1">
                {mode.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-xs text-gray-500">
                    <svg
                      className="h-3 w-3 sm:h-4 sm:w-4 text-green-500 mr-1 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="break-words">{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button or Completion Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
        {generationStatus === "completed" ? (
          // Show completion status with regenerate button
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-green-900">
                  Generation Completed Successfully!
                </p>
                <p className="text-sm text-green-700">
                  Your testbench files are ready. Check the Results section below.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-sm sm:text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5 text-gray-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Regenerate
            </button>
          </div>
        ) : generationStatus === "failed" ? (
          // Show failure status with retry button
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-red-900">
                  Generation Failed
                </p>
                <p className="text-sm text-red-700">
                  Please check the error logs and try again.
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Retry Generation
            </button>
          </div>
        ) : (
          // Show normal generate button
          <>
            <div className="text-sm text-gray-600">
              <p>
                Selected mode: <span className="font-medium">{selectedMode.toUpperCase()}</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Ensure all required files are uploaded before generating
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={disabled || isGenerating}
              className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-md shadow-sm text-white ${
                disabled || isGenerating
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              {isGenerating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Starting...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Generate Testbench
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GenerationControls;
