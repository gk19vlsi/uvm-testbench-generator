/**
 * Traceability Matrix Component
 * Displays mapping between specification requirements and UVM components
 * Shows coverage percentage and highlights gaps
 */

import { useState, useEffect } from "react";
import { getResults } from "../services/projectService";
import type { TraceabilityMatrix as TraceabilityMatrixType, Requirement, UVMComponent } from "../types";

interface TraceabilityMatrixProps {
  projectId: string;
}

interface CellDetailProps {
  requirement: Requirement;
  component: UVMComponent;
  covered: boolean;
  notes?: string;
  onClose: () => void;
}

const CellDetail: React.FC<CellDetailProps> = ({
  requirement,
  component,
  covered,
  notes,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Traceability Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
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
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {/* Coverage Status */}
          <div className="mb-6">
            <div className="flex items-center space-x-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  covered
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {covered ? (
                  <>
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Covered
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 mr-1.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Not Covered
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Requirement */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Requirement
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {requirement.id}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {requirement.category}
                </span>
              </div>
              <p className="text-sm text-gray-700">{requirement.text}</p>
            </div>
          </div>

          {/* Component */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              UVM Component
            </h4>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start space-x-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  {component.type}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {component.name}
              </p>
              <p className="text-xs text-gray-600 font-mono">
                {component.filePath}
              </p>
            </div>
          </div>

          {/* Notes */}
          {notes && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Notes
              </h4>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">{notes}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TraceabilityMatrix: React.FC<TraceabilityMatrixProps> = ({
  projectId,
}) => {
  const [matrixData, setMatrixData] = useState<TraceabilityMatrixType | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    requirement: Requirement;
    component: UVMComponent;
    covered: boolean;
    notes?: string;
  } | null>(null);

  useEffect(() => {
    const loadMatrixData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await getResults(projectId);
        setMatrixData(results.traceabilityMatrix);
      } catch (err) {
        console.error("Failed to load traceability matrix:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load traceability matrix",
        );
        // Use mock data for development
        setMatrixData(getMockMatrixData());
      } finally {
        setIsLoading(false);
      }
    };

    loadMatrixData();
  }, [projectId]);

  const getMockMatrixData = (): TraceabilityMatrixType => ({
    requirements: [
      {
        id: "REQ-1.1",
        text: "System shall accept PDF specification files",
        category: "File Input",
      },
      {
        id: "REQ-2.1",
        text: "System shall parse SystemVerilog RTL files",
        category: "RTL Processing",
      },
      {
        id: "REQ-3.1",
        text: "System shall detect AXI protocol",
        category: "Protocol Detection",
      },
      {
        id: "REQ-7.1",
        text: "Driver shall implement UVM phases",
        category: "UVM Generation",
      },
      {
        id: "REQ-7.2",
        text: "Monitor shall have analysis port",
        category: "UVM Generation",
      },
    ],
    components: [
      {
        id: "comp-1",
        name: "FileUploadService",
        type: "service",
        filePath: "services/FileUploadService.ts",
      },
      {
        id: "comp-2",
        name: "RTLParser",
        type: "parser",
        filePath: "parsers/rtlParser.ts",
      },
      {
        id: "comp-3",
        name: "SpecificationAgent",
        type: "agent",
        filePath: "agents/SpecificationAgent.ts",
      },
      {
        id: "comp-4",
        name: "axi_master_driver",
        type: "driver",
        filePath: "agents/axi_master_agent/axi_master_driver.sv",
      },
      {
        id: "comp-5",
        name: "axi_master_monitor",
        type: "monitor",
        filePath: "agents/axi_master_agent/axi_master_monitor.sv",
      },
    ],
    mappings: [
      {
        requirementId: "REQ-1.1",
        componentId: "comp-1",
        covered: true,
        notes: "File upload service handles PDF files",
      },
      {
        requirementId: "REQ-2.1",
        componentId: "comp-2",
        covered: true,
        notes: "RTL parser extracts module definitions",
      },
      {
        requirementId: "REQ-3.1",
        componentId: "comp-3",
        covered: true,
        notes: "Specification agent detects protocols",
      },
      {
        requirementId: "REQ-7.1",
        componentId: "comp-4",
        covered: true,
        notes: "Driver implements build, connect, and run phases",
      },
      {
        requirementId: "REQ-7.2",
        componentId: "comp-5",
        covered: true,
        notes: "Monitor has analysis port for transaction broadcasting",
      },
      {
        requirementId: "REQ-3.1",
        componentId: "comp-4",
        covered: true,
        notes: "AXI driver implements protocol-specific logic",
      },
    ],
    coveragePercentage: 85,
  });

  const getCellStatus = (
    requirementId: string,
    componentId: string,
  ): { covered: boolean; notes?: string } | null => {
    if (!matrixData) return null;
    const mapping = matrixData.mappings.find(
      (m) => m.requirementId === requirementId && m.componentId === componentId,
    );
    return mapping
      ? { covered: mapping.covered, notes: mapping.notes }
      : null;
  };

  const getRequirementCoverage = (requirementId: string): number => {
    if (!matrixData) return 0;
    const mappings = matrixData.mappings.filter(
      (m) => m.requirementId === requirementId && m.covered,
    );
    return mappings.length > 0
      ? (mappings.length / matrixData.components.length) * 100
      : 0;
  };

  const handleCellClick = (requirement: Requirement, component: UVMComponent) => {
    const status = getCellStatus(requirement.id, component.id);
    if (status) {
      setSelectedCell({
        requirement,
        component,
        covered: status.covered,
        notes: status.notes,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4">
            Loading traceability matrix...
          </p>
        </div>
      </div>
    );
  }

  if (error && !matrixData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg
            className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">
              Failed to load traceability matrix
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!matrixData) {
    return (
      <div className="text-center py-12">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-sm text-gray-600 mt-4">
          No traceability data available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Coverage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            Requirements Traceability Matrix
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Click on any cell to view details
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Overall Coverage:</span>
          <span className="text-2xl font-bold text-green-600">
            {matrixData.coveragePercentage}%
          </span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200"
                >
                  Requirements
                </th>
                {matrixData.components.map((component) => (
                  <th
                    key={component.id}
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                  >
                    <div className="truncate" title={component.name}>
                      {component.name}
                    </div>
                    <div className="text-xs text-gray-400 font-normal normal-case truncate">
                      {component.type}
                    </div>
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Coverage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrixData.requirements.map((requirement) => (
                <tr key={requirement.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 border-r border-gray-200">
                    <div className="text-xs font-medium text-gray-900">
                      {requirement.id}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {requirement.text}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {requirement.category}
                    </div>
                  </td>
                  {matrixData.components.map((component) => {
                    const status = getCellStatus(requirement.id, component.id);
                    return (
                      <td
                        key={component.id}
                        className={`px-3 py-3 text-center cursor-pointer transition-colors ${
                          status
                            ? status.covered
                              ? "bg-green-100 hover:bg-green-200"
                              : "bg-red-100 hover:bg-red-200"
                            : "bg-gray-50 hover:bg-gray-100"
                        }`}
                        onClick={() =>
                          status && handleCellClick(requirement, component)
                        }
                      >
                        {status ? (
                          status.covered ? (
                            <svg
                              className="w-5 h-5 text-green-600 mx-auto"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600 mx-auto"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${getRequirementCoverage(requirement.id)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">
                        {Math.round(getRequirementCoverage(requirement.id))}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-gray-600">Covered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-gray-600">Not Covered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gray-50 rounded flex items-center justify-center">
              <span className="text-gray-300">—</span>
            </div>
            <span className="text-gray-600">No Mapping</span>
          </div>
        </div>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
        <CellDetail
          requirement={selectedCell.requirement}
          component={selectedCell.component}
          covered={selectedCell.covered}
          notes={selectedCell.notes}
          onClose={() => setSelectedCell(null)}
        />
      )}
    </div>
  );
};

export default TraceabilityMatrix;
