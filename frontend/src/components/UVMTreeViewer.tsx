/**
 * UVM Tree Viewer Component
 * Hierarchical visualization of UVM testbench components
 * with expand/collapse functionality and component selection
 */

import { useState, useEffect } from "react";
import { getResults } from "../services/projectService";
import type { UVMTreeNode } from "../types";

interface UVMTreeViewerProps {
  projectId: string;
  onNodeSelect?: (node: UVMTreeNode) => void;
}

interface TreeNodeProps {
  node: UVMTreeNode;
  level: number;
  onSelect: (node: UVMTreeNode) => void;
  selectedNodeId: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  onSelect,
  selectedNodeId,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNodeId === node.id;

  const getIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      env: "🏢",
      agent: "🤖",
      driver: "🚗",
      monitor: "👁️",
      sequencer: "📋",
      scoreboard: "📊",
      interface: "🔌",
      sequence: "🔄",
      test: "🧪",
    };
    return iconMap[type] || "📄";
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      env: "text-purple-600",
      agent: "text-blue-600",
      driver: "text-green-600",
      monitor: "text-yellow-600",
      sequencer: "text-orange-600",
      scoreboard: "text-red-600",
      interface: "text-indigo-600",
      sequence: "text-pink-600",
      test: "text-teal-600",
    };
    return colorMap[type] || "text-gray-600";
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center space-x-2 py-2 px-3 rounded-md cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-100 border-l-4 border-blue-500"
            : "hover:bg-gray-100"
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
        onClick={() => onSelect(node)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-700"
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${
                isExpanded ? "rotate-90" : ""
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
          </button>
        )}
        {!hasChildren && <div className="w-5" />}

        {/* Icon */}
        <span className="text-lg flex-shrink-0">{getIcon(node.type)}</span>

        {/* Name and Type */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 truncate">
              {node.name}
            </span>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded ${getTypeColor(
                node.type,
              )} bg-opacity-10`}
            >
              {node.type}
            </span>
          </div>
          {node.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {node.description}
            </p>
          )}
        </div>

        {/* File indicator */}
        {node.filePath && (
          <svg
            className="w-4 h-4 text-gray-400 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <title>{node.filePath}</title>
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
              selectedNodeId={selectedNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const UVMTreeViewer: React.FC<UVMTreeViewerProps> = ({
  projectId,
  onNodeSelect,
}) => {
  const [treeData, setTreeData] = useState<UVMTreeNode | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTreeData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const results = await getResults(projectId);
        setTreeData(results.uvmTree);
      } catch (err) {
        console.error("Failed to load UVM tree:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load UVM tree",
        );
        // Use mock data for development
        setTreeData(getMockTreeData());
      } finally {
        setIsLoading(false);
      }
    };

    loadTreeData();
  }, [projectId]);

  const handleNodeSelect = (node: UVMTreeNode) => {
    setSelectedNodeId(node.id);
    onNodeSelect?.(node);
  };

  const getMockTreeData = (): UVMTreeNode => ({
    id: "env-1",
    name: "axi_slave_env",
    type: "env",
    filePath: "env/axi_slave_env.sv",
    description: "Top-level UVM environment",
    children: [
      {
        id: "agent-1",
        name: "axi_master_agent",
        type: "agent",
        filePath: "agents/axi_master_agent/axi_master_agent.sv",
        description: "AXI master agent",
        children: [
          {
            id: "driver-1",
            name: "axi_master_driver",
            type: "driver",
            filePath: "agents/axi_master_agent/axi_master_driver.sv",
            description: "Drives AXI transactions",
            children: [],
          },
          {
            id: "monitor-1",
            name: "axi_master_monitor",
            type: "monitor",
            filePath: "agents/axi_master_agent/axi_master_monitor.sv",
            description: "Monitors AXI bus",
            children: [],
          },
          {
            id: "sequencer-1",
            name: "axi_master_sequencer",
            type: "sequencer",
            filePath: "agents/axi_master_agent/axi_master_sequencer.sv",
            description: "Sequences AXI transactions",
            children: [],
          },
        ],
      },
      {
        id: "scoreboard-1",
        name: "axi_scoreboard",
        type: "scoreboard",
        filePath: "scoreboard/axi_scoreboard.sv",
        description: "Checks DUT correctness",
        children: [],
      },
      {
        id: "interface-1",
        name: "axi_if",
        type: "interface",
        filePath: "interfaces/axi_if.sv",
        description: "AXI interface with clocking blocks",
        children: [],
      },
    ],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4">Loading UVM tree...</p>
        </div>
      </div>
    );
  }

  if (error && !treeData) {
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
              Failed to load UVM tree
            </h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!treeData) {
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-sm text-gray-600 mt-4">No UVM tree data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            UVM Component Hierarchy
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Click on any component to view details
          </p>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Clear selection
        </button>
      </div>

      {/* Tree */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto p-2">
          <TreeNode
            node={treeData}
            level={0}
            onSelect={handleNodeSelect}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Component Types:</p>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
          {[
            { type: "env", icon: "🏢", label: "Environment" },
            { type: "agent", icon: "🤖", label: "Agent" },
            { type: "driver", icon: "🚗", label: "Driver" },
            { type: "monitor", icon: "👁️", label: "Monitor" },
            { type: "sequencer", icon: "📋", label: "Sequencer" },
            { type: "scoreboard", icon: "📊", label: "Scoreboard" },
            { type: "interface", icon: "🔌", label: "Interface" },
            { type: "sequence", icon: "🔄", label: "Sequence" },
            { type: "test", icon: "🧪", label: "Test" },
          ].map((item) => (
            <div key={item.type} className="flex items-center space-x-1">
              <span>{item.icon}</span>
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UVMTreeViewer;
