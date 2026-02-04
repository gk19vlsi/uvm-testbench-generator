/**
 * Generation Controls Component
 * Mode selection and generate button
 */

import { useState } from "react";

interface GenerationControlsProps {
  projectId: string;
  onGenerationStart: (generationId: string) => void;
  disabled?: boolean;
}

type GenerationMode = "mvp" | "production" | "advanced";

const GenerationControls: React.FC<GenerationControlsProps> = ({
  // projectId - TODO: Will be used for API calls
  onGenerationStart,
  disabled = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<GenerationMode>("production");
  const [isGenerating, setIsGenerating] = useState(false);

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
      // TODO: Call actual API endpoint
      // const response = await fetch(`/api/projects/${projectId}/generate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ mode: selectedMode })
      // });
      // const data = await response.json();

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockGenerationId = Math.random().toString(36).substring(7);

      onGenerationStart(mockGenerationId);
    } catch (error) {
      console.error("Failed to start generation:", error);
    } finally {
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

      {/* Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
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
      </div>
    </div>
  );
};

export default GenerationControls;
