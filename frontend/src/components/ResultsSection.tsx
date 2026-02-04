/**
 * Results Section Component
 * Displays UVM tree, traceability matrix, code editor, and download controls
 */

import { useState } from "react";
import UVMTreeViewer from "./UVMTreeViewer";
import ComponentDetailsPanel from "./ComponentDetailsPanel";
import TraceabilityMatrix from "./TraceabilityMatrix";
import InlineCodeEditor from "./InlineCodeEditor";
import SequenceCreator from "./SequenceCreator";
import DownloadManager from "./DownloadManager";
import ReadinessScoreDisplay from "./ReadinessScoreDisplay";
import GeneratedFilesList from "./GeneratedFilesList";
import { updateFileContent } from "../services/projectService";
import type { UVMTreeNode } from "../types";

interface ResultsSectionProps {
  projectId: string;
  projectName?: string;
}

type ResultTab = "tree" | "matrix" | "editor" | "readiness" | "files" | "download";

const ResultsSection: React.FC<ResultsSectionProps> = ({
  projectId,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<ResultTab>("readiness");
  const [selectedNode, setSelectedNode] = useState<UVMTreeNode | null>(null);
  const [editorFile, setEditorFile] = useState<{
    filePath: string;
    content: string;
    language: "systemverilog" | "verilog";
  } | null>(null);
  const [showSequenceCreator, setShowSequenceCreator] = useState(false);

  const tabs = [
    { id: "readiness" as ResultTab, name: "Readiness Score", icon: "📊" },
    { id: "files" as ResultTab, name: "Files", icon: "📁" },
    { id: "tree" as ResultTab, name: "UVM Tree", icon: "🌳" },
    { id: "matrix" as ResultTab, name: "Traceability", icon: "📋" },
    { id: "editor" as ResultTab, name: "Code Editor", icon: "💻" },
    { id: "download" as ResultTab, name: "Download", icon: "📦" },
  ];

  const handleDownload = async () => {
    // Switch to download tab
    setActiveTab("download");
  };

  const handleOpenInEditor = (node: UVMTreeNode, content: string) => {
    if (!node.filePath) return;
    
    const language = node.filePath.endsWith(".sv") ? "systemverilog" : "verilog";
    setEditorFile({
      filePath: node.filePath,
      content,
      language,
    });
    setActiveTab("editor");
  };

  const handleFileSelect = (filePath: string, content: string) => {
    const language = filePath.endsWith(".sv") ? "systemverilog" : "verilog";
    setEditorFile({
      filePath,
      content,
      language,
    });
    setActiveTab("editor");
  };

  const handleSaveFile = async (updatedCode: string): Promise<void> => {
    if (!editorFile) return;

    try {
      const result = await updateFileContent(
        projectId,
        editorFile.filePath,
        updatedCode,
      );

      if (!result.success && result.syntaxErrors) {
        throw {
          message: "Syntax validation failed",
          syntaxErrors: result.syntaxErrors,
        };
      }

      // Update the editor file content
      setEditorFile((prev) =>
        prev ? { ...prev, content: updatedCode } : null,
      );
    } catch (error) {
      throw error;
    }
  };

  const handleCloseEditor = () => {
    setEditorFile(null);
  };

  const handleSequenceCreated = async (
    filePath: string,
    content: string,
  ): Promise<void> => {
    try {
      // Save the new sequence file
      await updateFileContent(projectId, filePath, content);

      // Open the new sequence in the editor
      setEditorFile({
        filePath,
        content,
        language: "systemverilog",
      });
      setActiveTab("editor");
    } catch (error) {
      console.error("Failed to create sequence:", error);
      alert("Failed to create sequence. Please try again.");
    }
  };

  const renderReadinessScore = () => (
    <ReadinessScoreDisplay projectId={projectId} />
  );

  const renderFilesList = () => (
    <GeneratedFilesList projectId={projectId} onFileSelect={handleFileSelect} />
  );

  const renderUVMTree = () => (
    <div className="space-y-4">
      <UVMTreeViewer
        projectId={projectId}
        onNodeSelect={(node) => setSelectedNode(node)}
      />
      
      {selectedNode && (
        <ComponentDetailsPanel
          projectId={projectId}
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onOpenInEditor={handleOpenInEditor}
        />
      )}
    </div>
  );

  const renderTraceabilityMatrix = () => (
    <TraceabilityMatrix projectId={projectId} />
  );

  const renderDownload = () => (
    <DownloadManager projectId={projectId} projectName={projectName} />
  );

  const renderCodeEditor = () => (
    <div className="h-[600px]">
      {editorFile ? (
        <InlineCodeEditor
          code={editorFile.content}
          language={editorFile.language}
          filePath={editorFile.filePath}
          onSave={handleSaveFile}
          onClose={handleCloseEditor}
        />
      ) : (
        <div className="bg-white rounded-lg p-4 shadow h-full flex items-center justify-center">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No file selected
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Select a file from the UVM Tree to edit it here
            </p>
            <button
              onClick={() => setShowSequenceCreator(true)}
              className="mt-4 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Sequence
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Tab Navigation and Download Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex overflow-x-auto space-x-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-white text-gray-900 shadow"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="mr-1 sm:mr-2">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.name.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleDownload}
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          <svg
            className="-ml-1 mr-2 h-4 w-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Download ZIP
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px] sm:min-h-[400px]">
        {activeTab === "readiness" && renderReadinessScore()}
        {activeTab === "files" && renderFilesList()}
        {activeTab === "tree" && renderUVMTree()}
        {activeTab === "matrix" && renderTraceabilityMatrix()}
        {activeTab === "editor" && renderCodeEditor()}
        {activeTab === "download" && renderDownload()}
      </div>

      {/* Sequence Creator Dialog */}
      {showSequenceCreator && (
        <SequenceCreator
          onSequenceCreated={handleSequenceCreated}
          onClose={() => setShowSequenceCreator(false)}
        />
      )}
    </div>
  );
};

export default ResultsSection;
