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
import VisualizationPanel from "./VisualizationPanel";
import { TestbenchSpecification, Signal, SignalData } from "../types/simulation";
import { InterfaceParser } from "../services/InterfaceParser";

interface GenerationInterfaceProps {}

interface SectionState {
  upload: boolean;
  controls: boolean;
  progress: boolean;
  results: boolean;
  visualization: boolean;
}

const GenerationInterface: React.FC<GenerationInterfaceProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState<string>("");
  const [uploadedSpecFiles, setUploadedSpecFiles] = useState<any[]>([]);
  const [uploadedRtlFiles, setUploadedRtlFiles] = useState<any[]>([]);
  const [uvmTree, setUvmTree] = useState<any>(null);
  const [generatedFiles, setGeneratedFiles] = useState<any[]>([]);
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
    visualization: false,
  });

  // Load project data and check generation status
  useEffect(() => {
    if (!projectId) {
      navigate("/dashboard");
      return;
    }

    const loadProjectData = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const data = await response.json();
          const project = data.project;
          
          setProjectName(project.name || "Project " + projectId.substring(0, 8));
          
          // Store uploaded files
          if (project.specificationFiles && Array.isArray(project.specificationFiles)) {
            setUploadedSpecFiles(project.specificationFiles.map((file: any) => ({
              fileId: file.fileId,
              filename: file.filename,
              size: file.size,
              mimeType: file.mimeType,
              uploadedAt: file.uploadedAt,
              type: "specification" as const,
              status: "completed" as const,
              progress: 100,
            })));
          }
          
          if (project.rtlFiles && Array.isArray(project.rtlFiles)) {
            setUploadedRtlFiles(project.rtlFiles.map((file: any) => ({
              fileId: file.fileId,
              filename: file.filename,
              size: file.size,
              mimeType: file.mimeType,
              uploadedAt: file.uploadedAt,
              type: "rtl" as const,
              status: "completed" as const,
              progress: 100,
            })));
          }
          
          // Check if generation is complete
          if (project.status === "completed") {
            setGenerationStatus("completed");
            if (project.currentGeneration) {
              setGenerationId(project.currentGeneration.generationId);
            }
            // Store results data - check both locations for backward compatibility
            const results = data.generationResults || project.results;
            if (results) {
              console.log("[Project] Loaded results with", results.generatedFiles?.length, "generated files");
              console.log("[Project] Results source:", data.generationResults ? "data.generationResults" : "project.results");
              setUvmTree(results.uvmTree);
              setGeneratedFiles(results.generatedFiles || []);
            } else {
              console.log("[Project] ❌ No results found in response");
              console.log("[Project] Response keys:", Object.keys(data));
              console.log("[Project] Project keys:", Object.keys(project));
            }
          } else if (project.status === "failed") {
            setGenerationStatus("failed");
            if (project.currentGeneration) {
              setGenerationId(project.currentGeneration.generationId);
            }
          } else if (project.status === "generating") {
            setGenerationStatus("generating");
            if (project.currentGeneration) {
              setGenerationId(project.currentGeneration.generationId);
            }
          }
        }
      } catch (error) {
        console.error("Error loading project data:", error);
      }
    };

    loadProjectData();
  }, [projectId, navigate]);

  // Poll project status when generating
  useEffect(() => {
    if (generationStatus !== "generating" || !projectId) {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const project = await response.json();
          
          // Check if generation is complete
          if (project.status === "completed") {
            setGenerationStatus("completed");
            clearInterval(pollInterval);
            // Reload to show results
            window.location.reload();
          } else if (project.status === "failed") {
            setGenerationStatus("failed");
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error("Error polling project status:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(pollInterval);
  }, [generationStatus, projectId]);

  const handleGenerationStart = (genId: string) => {
    setGenerationId(genId);
    setGenerationStatus("generating");
    // Auto-collapse upload and controls sections when generation starts
    setCollapsed((prev) => ({ ...prev, upload: true, controls: true }));
  };

  const handleGenerationComplete = () => {
    setGenerationStatus("completed");
    // Reload project data to get results
    window.location.reload();
  };

  const handleGenerationFailed = () => {
    setGenerationStatus("failed");
  };

  const toggleSection = (section: keyof SectionState) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Convert UVM tree to TestbenchSpecification format
  const getSpecificationFromUvmTree = (): TestbenchSpecification => {
    if (!uvmTree) {
      // Return sample data if no UVM tree available
      return getSampleSpecification();
    }

    return {
      rtl: {
        moduleName: projectName || "dut",
        ports: [], // TODO: Extract from RTL files
      },
      verification: {
        testCases: [], // TODO: Extract from test files
        coverageGoals: [],
      },
      components: uvmTree.children || [uvmTree], // Use actual UVM tree
      signals: [], // TODO: Extract from interface files
      clocks: [
        {
          name: "clk",
          period: 10,
          dutyCycle: 0.5,
          phase: 0,
        },
      ],
    };
  };

  // Extract signals from generated interface files
  const getSignalsFromGeneratedFiles = (): Signal[] => {
    if (!generatedFiles || generatedFiles.length === 0) {
      console.log("[Visualization] No generated files available, using sample signals");
      return getSampleSignals();
    }

    console.log("[Visualization] Checking", generatedFiles.length, "files for interfaces");
    console.log("[Visualization] Full generatedFiles array:", JSON.stringify(generatedFiles, null, 2));
    console.log("[Visualization] Sample file structure:", JSON.stringify(generatedFiles[0], null, 2));
    console.log("[Visualization] All file paths:", generatedFiles.map((f: any) => f.path || f.filename || f.name));
    console.log("[Visualization] All file types:", generatedFiles.map((f: any) => f.type || f.fileType || "unknown"));

    // Find interface files - check type property and path
    const interfaceFiles = generatedFiles.filter(
      (file: any) => {
        console.log("[Visualization] Checking file:", {
          path: file.path,
          filename: file.filename,
          name: file.name,
          type: file.type,
          fileType: file.fileType,
          allKeys: Object.keys(file)
        });
        
        // Check if type is "interface"
        if (file.type === "interface" || file.fileType === "interface") {
          console.log("[Visualization] ✓ Found interface file by type:", file.path || file.filename || file.name);
          return true;
        }
        
        // Fallback: check path for interface patterns
        const pathStr = String(file.path || file.filename || file.name || "").toLowerCase();
        const isInterface = pathStr.includes("interface") || pathStr.includes("_if.sv") || pathStr.endsWith("_if.sv");
        
        if (isInterface) {
          console.log("[Visualization] ✓ Found interface file by path:", pathStr);
        } else {
          console.log("[Visualization] ✗ Not an interface file:", pathStr);
        }
        
        return isInterface;
      }
    );

    console.log("[Visualization] Found", interfaceFiles.length, "interface files");

    if (interfaceFiles.length === 0) {
      console.log("[Visualization] ❌ No interface files found in generated files");
      console.log("[Visualization] Available file types:", generatedFiles.map((f: any) => f.type || f.fileType || "unknown"));
      console.log("[Visualization] Available file paths:", generatedFiles.map((f: any) => f.path || f.filename || f.name));
      console.log("[Visualization] Full file objects:", generatedFiles.map((f: any) => ({
        path: f.path,
        filename: f.filename,
        name: f.name,
        type: f.type,
        fileType: f.fileType,
        hasContent: !!f.content
      })));
      return getSampleSignals();
    }

    // Parse the first interface file
    const interfaceFile = interfaceFiles[0];
    console.log("[Visualization] Processing interface file:", {
      path: interfaceFile.path || interfaceFile.filename || interfaceFile.name,
      hasContent: !!interfaceFile.content,
      contentLength: interfaceFile.content?.length || 0,
      contentPreview: interfaceFile.content?.substring(0, 200) || "NO CONTENT",
      allKeys: Object.keys(interfaceFile)
    });
    
    try {
      // If we have the content, parse it
      if (interfaceFile.content) {
        console.log("[Visualization] Parsing interface content...");
        const parsedSignals = InterfaceParser.parseInterface(interfaceFile.content);
        const vizSignals = InterfaceParser.toVisualizationSignals(parsedSignals);
        console.log(`[Visualization] ✓ Successfully parsed ${vizSignals.length} signals from ${interfaceFile.path || interfaceFile.filename}`);
        return vizSignals;
      } else {
        console.log("[Visualization] ❌ Interface file has no content property");
        console.log("[Visualization] File keys:", Object.keys(interfaceFile));
        console.log("[Visualization] Checking alternative content fields...");
        
        // Check for alternative content field names
        const possibleContentFields = ['content', 'fileContent', 'data', 'text', 'code'];
        for (const field of possibleContentFields) {
          if (interfaceFile[field]) {
            console.log(`[Visualization] Found content in field: ${field}`);
            const parsedSignals = InterfaceParser.parseInterface(interfaceFile[field]);
            const vizSignals = InterfaceParser.toVisualizationSignals(parsedSignals);
            console.log(`[Visualization] ✓ Successfully parsed ${vizSignals.length} signals using field ${field}`);
            return vizSignals;
          }
        }
        
        console.log("[Visualization] ❌ No content found in any known field");
      }
    } catch (error) {
      console.error("[Visualization] ❌ Error parsing interface file:", error);
      console.error("[Visualization] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return getSampleSignals();
  };

  // Get signal data (would come from VCD file parsing or generate sample based on real signals)
  const getSignalDataFromSimulation = (): SignalData[] => {
    if (!generatedFiles || generatedFiles.length === 0) {
      console.log("[Visualization] No generated files for signal data, using sample");
      return getSampleSignalData();
    }

    console.log("[Visualization] Generating signal data from", generatedFiles.length, "files");

    // Find interface files to extract signal definitions
    const interfaceFiles = generatedFiles.filter(
      (file: any) => {
        // Check if type is "interface"
        if (file.type === "interface" || file.fileType === "interface") {
          return true;
        }
        
        // Fallback: check path for interface patterns
        const pathStr = String(file.path || file.filename || file.name || "").toLowerCase();
        return pathStr.includes("interface") || pathStr.includes("_if.sv") || pathStr.endsWith("_if.sv");
      }
    );

    console.log("[Visualization] Found", interfaceFiles.length, "interface files for signal data");

    if (interfaceFiles.length === 0) {
      console.log("[Visualization] No interface files for signal data, using sample");
      return getSampleSignalData();
    }

    try {
      const interfaceFile = interfaceFiles[0];
      console.log("[Visualization] Generating signal data from:", interfaceFile.path || interfaceFile.filename || interfaceFile.name);
      
      // Check for content in various possible fields
      const content = interfaceFile.content || interfaceFile.fileContent || interfaceFile.data || interfaceFile.text || interfaceFile.code;
      
      if (content) {
        console.log("[Visualization] Parsing interface for signal data generation...");
        const parsedSignals = InterfaceParser.parseInterface(content);
        // Generate realistic sample data based on actual signal definitions
        const signalData = InterfaceParser.generateSampleSignalData(parsedSignals, 100);
        console.log(`[Visualization] ✓ Generated waveform data for ${signalData.length} signals`);
        if (signalData.length > 0) {
          console.log(`[Visualization] Sample signal data:`, signalData[0]);
        }
        return signalData;
      } else {
        console.log("[Visualization] ❌ No content found in interface file for signal data");
      }
    } catch (error) {
      console.error("[Visualization] ❌ Error generating signal data:", error);
      console.error("[Visualization] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return getSampleSignalData();
  };

  // Helper function to get sample specification
  // TODO: Replace with actual specification from backend
  const getSampleSpecification = (): TestbenchSpecification => {
    return {
      rtl: {
        moduleName: projectName || "dut",
        ports: [],
      },
      verification: {
        testCases: [],
        coverageGoals: [],
      },
      components: [
        {
          id: "env_1",
          type: "env",
          name: `${projectName}_env`,
          children: [
            {
              id: "agent_1",
              type: "agent",
              name: `${projectName}_agent`,
              children: [
                {
                  id: "driver_1",
                  type: "driver",
                  name: `${projectName}_driver`,
                  children: [],
                },
                {
                  id: "monitor_1",
                  type: "monitor",
                  name: `${projectName}_monitor`,
                  children: [],
                },
                {
                  id: "sequencer_1",
                  type: "sequencer",
                  name: `${projectName}_sequencer`,
                  children: [],
                },
              ],
            },
            {
              id: "scoreboard_1",
              type: "scoreboard",
              name: `${projectName}_scoreboard`,
              children: [],
            },
          ],
        },
      ],
      signals: [],
      clocks: [
        {
          name: "clk",
          period: 10,
          dutyCycle: 0.5,
          phase: 0,
        },
      ],
    };
  };

  // Helper function to get sample signals
  // TODO: Replace with actual signals from backend
  const getSampleSignals = (): Signal[] => {
    return [
      {
        id: "clk",
        name: "clk",
        type: "clock",
        color: "#22c55e",
        bitWidth: 1,
      },
      {
        id: "data_in",
        name: "data_in",
        type: "data",
        color: "#3b82f6",
        bitWidth: 8,
      },
      {
        id: "data_out",
        name: "data_out",
        type: "data",
        color: "#3b82f6",
        bitWidth: 8,
      },
      {
        id: "valid",
        name: "valid",
        type: "control",
        color: "#f59e0b",
        bitWidth: 1,
      },
    ];
  };

  // Helper function to get sample signal data
  // TODO: Replace with actual signal data from backend/VCD parser
  const getSampleSignalData = (): SignalData[] => {
    return [
      {
        signalId: "clk",
        transitions: Array.from({ length: 20 }, (_, i) => ({
          time: i * 5,
          value: i % 2,
        })),
      },
      {
        signalId: "data_in",
        transitions: [
          { time: 0, value: 0 },
          { time: 10, value: 15 },
          { time: 20, value: 32 },
          { time: 30, value: 128 },
          { time: 40, value: 255 },
          { time: 50, value: 64 },
        ],
      },
      {
        signalId: "data_out",
        transitions: [
          { time: 0, value: 0 },
          { time: 12, value: 15 },
          { time: 22, value: 32 },
          { time: 32, value: 128 },
          { time: 42, value: 255 },
          { time: 52, value: 64 },
        ],
      },
      {
        signalId: "valid",
        transitions: [
          { time: 0, value: 0 },
          { time: 10, value: 1 },
          { time: 20, value: 0 },
          { time: 30, value: 1 },
          { time: 40, value: 0 },
          { time: 50, value: 1 },
        ],
      },
    ];
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
                <FileUploadSection 
                  projectId={projectId!} 
                  initialSpecFiles={uploadedSpecFiles}
                  initialRtlFiles={uploadedRtlFiles}
                />
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
                  generationStatus={generationStatus}
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

          {/* Visualization Section - Collapsible */}
          {generationStatus === "completed" && (
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                {renderSectionHeader(
                  "5. Simulation Visualization",
                  "visualization",
                  "Interactive",
                )}
              </div>
              {!collapsed.visualization && (
                <div className="p-4 sm:p-6">
                  <VisualizationPanel
                    projectId={projectId!}
                    generationId={generationId || undefined}
                    specification={getSpecificationFromUvmTree()}
                    signals={getSignalsFromGeneratedFiles()}
                    signalData={getSignalDataFromSimulation()}
                  />
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
