/**
 * Download Manager Component
 * Handles ZIP download and individual file downloads
 */

import { useState } from "react";
import { downloadTestbench, getFileContent } from "../services/projectService";

interface DownloadManagerProps {
  projectId: string;
  projectName?: string;
}

const DownloadManager: React.FC<DownloadManagerProps> = ({
  projectId,
  projectName = "testbench",
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleZipDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadError(null);

    try {
      // Simulate progress for better UX (actual progress tracking would require backend support)
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Download the ZIP file
      const blob = await downloadTestbench(projectId);

      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
      const filename = `${projectName}-${timestamp}.zip`;
      link.download = filename;

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Reset progress after a short delay
      setTimeout(() => {
        setDownloadProgress(0);
      }, 2000);
    } catch (error: any) {
      console.error("Failed to download testbench:", error);
      setDownloadError(
        error.response?.data?.message ||
          error.message ||
          "Failed to download testbench. Please try again.",
      );
      setDownloadProgress(0);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ZIP Download Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              Download Complete Testbench
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              Download all generated files as a ZIP archive with preserved directory
              structure
            </p>
          </div>
          <button
            onClick={handleZipDownload}
            disabled={isDownloading}
            className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
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
                Downloading...
              </>
            ) : (
              <>
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
              </>
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {isDownloading && downloadProgress > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Downloading...</span>
              <span>{downloadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {!isDownloading && downloadProgress === 100 && (
          <div className="mt-3 flex items-center text-sm text-green-700">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Download completed successfully!
          </div>
        )}

        {/* Error Message */}
        {downloadError && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
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
                <p className="text-sm font-medium text-red-800">Download Failed</p>
                <p className="text-sm text-red-700 mt-1">{downloadError}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Download Info */}
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
              What's included in the ZIP?
            </h4>
            <ul className="mt-2 text-xs text-blue-800 space-y-1">
              <li>• All generated UVM components (drivers, monitors, agents, etc.)</li>
              <li>• Test sequences and test cases</li>
              <li>• Testbench top module and interfaces</li>
              <li>• README.md with compilation and simulation instructions</li>
              <li>• Complete directory structure preserved</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadManager;

// Export the individual file download function for use in other components
export const downloadIndividualFile = async (
  projectId: string,
  filePath: string,
): Promise<void> => {
  try {
    // Get file content
    const fileData = await getFileContent(projectId, filePath);

    // Create blob from content
    const blob = new Blob([fileData.content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = filePath.split("/").pop() || "file.sv";

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("Failed to download file:", error);
    throw new Error(error.message || "Failed to download file");
  }
};
