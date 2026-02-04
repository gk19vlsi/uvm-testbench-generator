/**
 * LLM Settings Dialog Component
 * Allows users to configure OpenAI model selection
 */

import { useState, useEffect } from "react";
import { getLLMConfig, saveLLMConfig } from "../services/llmService";
import type { LLMConfiguration } from "../services/llmService";

interface LLMSettingsDialogProps {
  onClose: () => void;
}

const LLMSettingsDialog: React.FC<LLMSettingsDialogProps> = ({ onClose }) => {
  const [config, setConfig] = useState<LLMConfiguration | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const modelDescriptions: Record<string, { name: string; description: string }> = {
    "gpt-4": {
      name: "GPT-4",
      description: "Most capable model, best for complex testbench generation",
    },
    "gpt-4-turbo": {
      name: "GPT-4 Turbo",
      description: "Faster and more cost-effective than GPT-4",
    },
    "gpt-3.5-turbo": {
      name: "GPT-3.5 Turbo",
      description: "Fast and efficient, suitable for simpler testbenches",
    },
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const configData = await getLLMConfig();
      setConfig(configData);
      setSelectedModel(configData.defaultModel);
    } catch (err: any) {
      console.error("Failed to load LLM config:", err);
      setError("Failed to load LLM configuration. Using default settings.");
      // Set default values
      setConfig({
        provider: "openai",
        defaultModel: "gpt-4",
        models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        validated: false,
      });
      setSelectedModel("gpt-4");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModel) return;

    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const result = await saveLLMConfig(selectedModel);

      if (result.success && result.validated) {
        setSaveSuccess(true);
        // Update local config
        if (config) {
          setConfig({
            ...config,
            defaultModel: selectedModel,
            validated: true,
            validatedAt: new Date().toISOString(),
          });
        }

        // Close dialog after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      } else if (!result.validated) {
        setError(
          result.error ||
            "API key validation failed. Please check your OpenAI API key in the backend environment variables.",
        );
      } else {
        setError(result.error || "Failed to save configuration");
      }
    } catch (err: any) {
      console.error("Failed to save LLM config:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save configuration. Please try again.",
      );
    } finally {
      setIsSaving(false);
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
                LLM Configuration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure OpenAI model for testbench generation
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
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
              {/* API Key Status */}
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
                      API Key Configuration
                    </h4>
                    <p className="text-sm text-blue-800 mt-1">
                      OpenAI API key is configured in the backend environment
                      variables (OPENAI_API_KEY). The key will be validated when you
                      save your model selection.
                    </p>
                    {config?.validated && config.validatedAt && (
                      <p className="text-xs text-blue-700 mt-2">
                        ✓ Last validated:{" "}
                        {new Date(config.validatedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select OpenAI Model
                </label>
                <div className="space-y-3">
                  {config?.models.map((model) => (
                    <label
                      key={model}
                      className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedModel === model
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <input
                        type="radio"
                        name="model"
                        value={model}
                        checked={selectedModel === model}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="mt-1 mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">
                            {modelDescriptions[model]?.name || model}
                          </div>
                          {config.defaultModel === model && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {modelDescriptions[model]?.description ||
                            "OpenAI language model"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Success Message */}
              {saveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
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
                      <p className="text-sm font-medium text-green-800">
                        Configuration Saved Successfully
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        API key validated and model selection saved. Future
                        generations will use {selectedModel}.
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                      <p className="text-sm font-medium text-red-800">
                        Configuration Error
                      </p>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Comparison Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Model Comparison
                </h4>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span className="font-medium">GPT-4:</span>
                    <span>Best quality, slower, higher cost</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">GPT-4 Turbo:</span>
                    <span>Great quality, faster, moderate cost</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">GPT-3.5 Turbo:</span>
                    <span>Good quality, fastest, lowest cost</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedModel || selectedModel === config?.defaultModel}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline"
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
                  Validating & Saving...
                </>
              ) : (
                "Save Configuration"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMSettingsDialog;
