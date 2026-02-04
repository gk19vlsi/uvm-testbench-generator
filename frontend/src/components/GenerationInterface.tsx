/**
 * Unified Generation Interface Component
 * Single-page layout with all sections visible:
 * - File upload areas (specification and RTL)
 * - Generation controls (mode selection, generate button)
 * - Progress tracker section
 * - Results sections (UVM tree, traceability matrix, code editor)
 * - Download controls
 * 
 * Features responsive layout with collapsible sections
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import FileUploadSection from "./FileUploadSection";
import GenerationControls from "./GenerationControls";
import ProgressTracker from "./ProgressTracker";
import ResultsSection from "./ResultsSection";
import LLMSettingsDialog from "./LLMSettingsDialog";

interface GenerationInterfaceProps {}

interface SectionState {
  upload: boolean;
  controls: boolean;
  progress: boolean;
  results: boolean;
}

const GenerationInterface: React.FC<GenerationInterfaceProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState<string>("");
  const [generationStatus, setGenerationStatus] = useState<
    "idle" | "generating" | "completed" | "failed"
  >("idle");
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  
  // Collapsible section states
  const [collapsed, setCollapsed] = useState<SectionState>({
    upload: false,
    controls: false,
    progress: false,
    results: false,
  });

  // Placeholder for project data loading
  useEffect(() => {
    if (!projectId) {
      navigate("/dashboard");
      return;
    }

    // TODO: Load project data from API
    setProjectName("Project " + projectId.substring(0, 8));
  }, [projectId, navigate]);

  const handleGenerationStart = (genId: string) => {
    setGenerationId(genId);
    setGenerationStatus("generating");
    // Auto-collapse upload and controls sections when generation starts
    setCollapsed((prev) => ({ ...prev, upload: true, controls: true }));
  };

  const handleGenerationComplete = () => {
    setGenerationStatus("completed");
  };

  const handleGenerationFailed = () => {
    setGenerationStatus("failed");
  };

  const toggleSection = (section: keyof SectionState) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderSectionHeader = (
    title: string,
    sectionKey: keyof SectionState,
    badge?: string,
  ) => (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {badge}
          </span>
        )}
      </div>
      <button
        onClick={() => toggleSection(sectionKey)}
        className="text-gray-400 hover:text-gray-600 transition-colors"
        aria-label={collapsed[sectionKey] ? "Expand section" : "Collapse section"}
      >
        <svg
          className={`h-5 w-5 transform transition-transform ${
            collapsed[sectionKey] ? "rotate-180" : ""
          }`}
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
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Sticky on scroll */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-3 sm:py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
                title="Back to Dashboard"
              >
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {projectName}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500">
                  Testbench Generation Interface
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowLLMSettings(true)}
                className="inline-flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                title="LLM Settings"
              >
                <svg
                  className="w-4 h-4 sm:mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="hidden sm:inline">LLM Settings</span>
              </button>
              <span
                className={`inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                  generationStatus === "idle"
                    ? "bg-gray-100 text-gray-800"
                    : generationStatus === "generating"
                      ? "bg-blue-100 text-blue-800"
                      : generationStatus === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {generationStatus === "idle" && "Ready"}
                {generationStatus === "generating" && "Generating..."}
                {generationStatus === "completed" && "Completed"}
                {generationStatus === "failed" && "Failed"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Single Page Layout with Responsive Grid */}
      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          {/* File Upload Section - Collapsible */}
          <section className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              {renderSectionHeader("1. Upload Files", "upload")}
            </div>
            {!collapsed.upload && (
              <div className="p-4 sm:p-6">
                <FileUploadSection projectId={projectId!} />
              </div>
            )}
          </section>

          {/* Generation Controls Section - Collapsible */}
          <section className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              {renderSectionHeader("2. Configure & Generate", "controls")}
            </div>
            {!collapsed.controls && (
              <div className="p-4 sm:p-6">
                <GenerationControls
                  projectId={projectId!}
                  onGenerationStart={handleGenerationStart}
                  disabled={generationStatus === "generating"}
                />
              </div>
            )}
          </section>

          {/* Progress Tracker Section - Collapsible */}
          {(generationStatus === "generating" ||
            generationStatus === "completed" ||
            generationStatus === "failed") && (
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                {renderSectionHeader(
                  "3. Generation Progress",
                  "progress",
                  generationStatus === "generating" ? "In Progress" : undefined,
                )}
              </div>
              {!collapsed.progress && (
                <div className="p-4 sm:p-6">
                  <ProgressTracker
                    projectId={projectId!}
                    generationId={generationId}
                    onComplete={handleGenerationComplete}
                    onFailed={handleGenerationFailed}
                  />
                </div>
              )}
            </section>
          )}

          {/* Results Section - Collapsible */}
          {generationStatus === "completed" && (
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                {renderSectionHeader(
                  "4. Results & Download",
                  "results",
                  "Ready",
                )}
              </div>
              {!collapsed.results && (
                <div className="p-4 sm:p-6">
                  <ResultsSection projectId={projectId!} projectName={projectName} />
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* LLM Settings Dialog */}
      {showLLMSettings && (
        <LLMSettingsDialog onClose={() => setShowLLMSettings(false)} />
      )}
    </div>
  );
};

export default GenerationInterface;
