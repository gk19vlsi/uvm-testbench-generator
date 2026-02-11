/**
 * Generated Files List Component
 * Displays a list of all generated files with ability to view content
 */

import { useState, useEffect } from "react";
import { getResults } from "../services/projectService";

interface GeneratedFilesListProps {
  projectId: string;
  onFileSelect?: (filePath: string, content: string) => void;
}

interface GeneratedFile {
  path: string;
  type: string;
  content: string;
}

const GeneratedFilesList: React.FC<GeneratedFilesListProps> = ({
  projectId,
  onFileSelect,
}) => {
  const [files, setFiles] = useState<GeneratedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["root"]));

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const results = await getResults(projectId);
        
        if (results.generatedFiles) {
          setFiles(results.generatedFiles);
        }
        
        setError(null);
      } catch (err) {
        console.error("Error fetching files:", err);
        setError("Failed to load generated files");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [projectId]);

  const getFileIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      transaction: "📦",
      interface: "🔌",
      driver: "🚗",
      monitor: "👁️",
      sequencer: "📋",
      agent: "🤖",
      env: "🏢",
      scoreboard: "📊",
      top: "🏠",
      sequence: "🔄",
      test: "🧪",
    };
    return iconMap[type] || "📄";
  };

  const getFileTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      transaction: "text-purple-600",
      interface: "text-indigo-600",
      driver: "text-green-600",
      monitor: "text-yellow-600",
      sequencer: "text-orange-600",
      agent: "text-blue-600",
      env: "text-purple-600",
      scoreboard: "text-red-600",
      top: "text-gray-600",
      sequence: "text-pink-600",
      test: "text-teal-600",
    };
    return colorMap[type] || "text-gray-600";
  };

  // Organize files by folder
  const organizeFilesByFolder = () => {
    const folderStructure: Record<string, GeneratedFile[]> = {};
    
    files.forEach((file) => {
      const parts = file.path.split("/");
      const folder = parts.length > 1 ? parts[0] : "root";
      
      if (!folderStructure[folder]) {
        folderStructure[folder] = [];
      }
      folderStructure[folder].push(file);
    });

    return folderStructure;
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  };

  const handleFileClick = async (file: GeneratedFile) => {
    setSelectedFile(file.path);
    if (onFileSelect) {
      onFileSelect(file.path, file.content);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-gray-600">No files generated yet</p>
      </div>
    );
  }

  const folderStructure = organizeFilesByFolder();

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Generated Files
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {files.length} files
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {Object.entries(folderStructure).map(([folder, folderFiles]) => (
          <div key={folder}>
            {/* Folder Header */}
            <button
              onClick={() => toggleFolder(folder)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className={`w-4 h-4 text-gray-500 transform transition-transform ${
                    expandedFolders.has(folder) ? "rotate-90" : ""
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <svg
                  className="w-5 h-5 text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {folder}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {folderFiles.length} files
              </span>
            </button>

            {/* Files in Folder */}
            {expandedFolders.has(folder) && (
              <div className="bg-gray-50">
                {folderFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleFileClick(file)}
                    className={`w-full flex items-center justify-between px-8 py-2.5 hover:bg-gray-100 transition-colors ${
                      selectedFile === file.path
                        ? "bg-blue-50 border-l-4 border-blue-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <span className="text-lg flex-shrink-0">
                        {getFileIcon(file.type)}
                      </span>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.path.split("/").pop()}
                        </p>
                        <p
                          className={`text-xs ${getFileTypeColor(file.type)} capitalize`}
                        >
                          {file.type}
                        </p>
                      </div>
                    </div>
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GeneratedFilesList;
