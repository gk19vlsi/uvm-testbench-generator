/**
 * Component Diagram Component
 * React component for displaying UVM testbench component hierarchy
 * Uses SVG for rendering components and connections
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { ComponentGraphBuilder } from "../services/ComponentGraphBuilder";
import {
  TestbenchSpecification,
  ComponentNode,
  ComponentEdge,
  ComponentGraph,
} from "../types/simulation";
import { useSimulation } from "../contexts/SimulationContext";

interface ComponentDiagramProps {
  specification: TestbenchSpecification;
  onComponentClick?: (component: ComponentNode) => void;
  className?: string;
}

interface ExpandedState {
  [componentId: string]: boolean;
}

const ComponentDiagram: React.FC<ComponentDiagramProps> = ({
  specification,
  onComponentClick,
  className = "",
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const builderRef = useRef<ComponentGraphBuilder | null>(null);

  // Get persisted settings from context
  const {
    expandedComponents: persistedExpanded,
    setExpandedComponents: persistExpandedComponents,
    theme,
  } = useSimulation();

  const [graph, setGraph] = useState<ComponentGraph | null>(null);
  const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
  const [expandedComponents, setExpandedComponents] =
    useState<ExpandedState>(persistedExpanded);
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Sync local expandedComponents with persisted settings
  useEffect(() => {
    setExpandedComponents(persistedExpanded);
  }, [persistedExpanded]);

  // Initialize builder and build graph
  useEffect(() => {
    const builder = new ComponentGraphBuilder();
    builderRef.current = builder;

    const builtGraph = builder.buildGraph(specification);
    setGraph(builtGraph);

    // Initialize expanded state from persisted settings or default to all expanded
    if (Object.keys(persistedExpanded).length === 0) {
      const initialExpanded: ExpandedState = {};
      const initializeExpanded = (nodes: ComponentNode[]) => {
        nodes.forEach((node) => {
          if (node.children.length > 0) {
            initialExpanded[node.id] = true;
          }
          if (node.children.length > 0) {
            initializeExpanded(node.children);
          }
        });
      };
      initializeExpanded(builtGraph.nodes);
      setExpandedComponents(initialExpanded);
      persistExpandedComponents(initialExpanded);
    }
  }, [specification, persistedExpanded, persistExpandedComponents]);

  // Handle component click
  const handleComponentClick = useCallback(
    (e: React.MouseEvent<SVGGElement>, component: ComponentNode) => {
      e.stopPropagation();

      // Highlight the component
      setHighlightedComponent(component.id);
      if (builderRef.current) {
        builderRef.current.highlightComponent(component.id);
      }

      // Call the callback
      if (onComponentClick) {
        onComponentClick(component);
      }
    },
    [onComponentClick],
  );

  // Handle expand/collapse toggle
  const handleToggleExpand = useCallback(
    (e: React.MouseEvent, componentId: string) => {
      e.stopPropagation();
      const newExpanded = {
        ...expandedComponents,
        [componentId]: !expandedComponents[componentId],
      };
      setExpandedComponents(newExpanded);
      persistExpandedComponents(newExpanded);
    },
    [expandedComponents, persistExpandedComponents],
  );

  // Get component color based on type and theme
  const getComponentColor = (type: ComponentNode["type"]): string => {
    // Use theme-aware colors from design system
    const lightColors: Record<ComponentNode["type"], string> = {
      env: "#3b82f6", // primary-500
      agent: "#8b5cf6", // violet-500
      driver: "#22c55e", // green-500
      monitor: "#f59e0b", // amber-500
      sequencer: "#ec4899", // pink-500
      scoreboard: "#a855f7", // purple-500
    };

    const darkColors: Record<ComponentNode["type"], string> = {
      env: "#60a5fa", // primary-400
      agent: "#a78bfa", // violet-400
      driver: "#4ade80", // green-400
      monitor: "#fbbf24", // amber-400
      sequencer: "#f472b6", // pink-400
      scoreboard: "#c084fc", // purple-400
    };

    const colors = theme === "light" ? lightColors : darkColors;
    return colors[type] || "#888888";
  };

  // Get component stroke color (darker version for borders)
  const getComponentStrokeColor = (type: ComponentNode["type"]): string => {
    // Use theme-aware darker colors for borders
    const lightColors: Record<ComponentNode["type"], string> = {
      env: "#1d4ed8", // primary-700
      agent: "#6d28d9", // violet-700
      driver: "#15803d", // green-700
      monitor: "#b45309", // amber-700
      sequencer: "#be185d", // pink-700
      scoreboard: "#7e22ce", // purple-700
    };

    const darkColors: Record<ComponentNode["type"], string> = {
      env: "#2563eb", // primary-600
      agent: "#7c3aed", // violet-600
      driver: "#16a34a", // green-600
      monitor: "#d97706", // amber-600
      sequencer: "#db2777", // pink-600
      scoreboard: "#9333ea", // purple-600
    };

    const colors = theme === "light" ? lightColors : darkColors;
    return colors[type] || "#555555";
  };

  // Render a single component node
  const renderComponent = (
    node: ComponentNode,
    isExpanded: boolean,
  ): JSX.Element => {
    const isHighlighted = highlightedComponent === node.id;
    const isHovered = hoveredComponent === node.id;
    const hasChildren = node.children.length > 0;

    const fillColor = getComponentColor(node.type);
    const strokeColor = getComponentStrokeColor(node.type);

    return (
      <g
        key={node.id}
        transform={`translate(${node.position.x}, ${node.position.y})`}
        onClick={(e) => handleComponentClick(e, node)}
        onMouseEnter={() => setHoveredComponent(node.id)}
        onMouseLeave={() => setHoveredComponent(null)}
        style={{ cursor: "pointer" }}
      >
        {/* Component rectangle */}
        <rect
          width={node.size.width}
          height={node.size.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={isHighlighted ? 4 : isHovered ? 3 : 2}
          rx={8}
          ry={8}
          opacity={isHighlighted ? 1.0 : isHovered ? 0.9 : 0.8}
        />

        {/* Component type label */}
        <text
          x={node.size.width / 2}
          y={20}
          textAnchor="middle"
          fill="white"
          fontSize="12"
          fontWeight="bold"
        >
          {node.type.toUpperCase()}
        </text>

        {/* Component name */}
        <text
          x={node.size.width / 2}
          y={node.size.height / 2 + 5}
          textAnchor="middle"
          fill="white"
          fontSize="14"
          fontWeight="normal"
        >
          {node.name}
        </text>

        {/* Expand/collapse button for hierarchical components */}
        {hasChildren && (
          <g
            onClick={(e) => handleToggleExpand(e, node.id)}
            style={{ cursor: "pointer" }}
          >
            <circle
              cx={node.size.width - 15}
              cy={15}
              r={10}
              fill="white"
              stroke={strokeColor}
              strokeWidth={2}
            />
            <text
              x={node.size.width - 15}
              y={20}
              textAnchor="middle"
              fill={strokeColor}
              fontSize="14"
              fontWeight="bold"
            >
              {isExpanded ? "−" : "+"}
            </text>
          </g>
        )}

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <g>
            {node.children.map((child) =>
              renderComponent(child, expandedComponents[child.id] ?? true),
            )}
          </g>
        )}
      </g>
    );
  };

  // Render connection edge
  const renderEdge = (edge: ComponentEdge, nodes: ComponentNode[]): JSX.Element | null => {
    const fromNode = findNodeById(nodes, edge.from);
    const toNode = findNodeById(nodes, edge.to);

    if (!fromNode || !toNode) {
      return null;
    }

    // Check if nodes are visible (parent is expanded)
    if (!isNodeVisible(fromNode, nodes) || !isNodeVisible(toNode, nodes)) {
      return null;
    }

    // Calculate connection points
    const fromX = fromNode.position.x + fromNode.size.width / 2;
    const fromY = fromNode.position.y + fromNode.size.height;
    const toX = toNode.position.x + toNode.size.width / 2;
    const toY = toNode.position.y;

    // Get edge color based on type
    const edgeColor =
      edge.type === "tlm"
        ? "#4A90E2"
        : edge.type === "analysis"
          ? "#50C878"
          : "#888888";

    // Create path for curved connection
    const midY = (fromY + toY) / 2;
    const path = `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`;

    return (
      <g key={edge.id}>
        {/* Connection line */}
        <path
          d={path}
          fill="none"
          stroke={edgeColor}
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
        />

        {/* Edge label */}
        <text
          x={(fromX + toX) / 2}
          y={midY}
          textAnchor="middle"
          fill="#666666"
          fontSize="10"
          fontWeight="normal"
        >
          {edge.label}
        </text>
      </g>
    );
  };

  // Find node by ID (recursive)
  const findNodeById = (
    nodes: ComponentNode[],
    id: string,
  ): ComponentNode | null => {
    for (const node of nodes) {
      if (node.id === id) {
        return node;
      }
      if (node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Check if node is visible (all parents are expanded)
  const isNodeVisible = (
    node: ComponentNode,
    allNodes: ComponentNode[],
  ): boolean => {
    // Find parent
    const parent = findParentNode(allNodes, node.id);
    if (!parent) {
      return true; // Root node is always visible
    }

    // Check if parent is expanded
    if (!expandedComponents[parent.id]) {
      return false;
    }

    // Recursively check parent's visibility
    return isNodeVisible(parent, allNodes);
  };

  // Find parent node
  const findParentNode = (
    nodes: ComponentNode[],
    childId: string,
  ): ComponentNode | null => {
    for (const node of nodes) {
      if (node.children.some((child) => child.id === childId)) {
        return node;
      }
      if (node.children.length > 0) {
        const found = findParentNode(node.children, childId);
        if (found) return found;
      }
    }
    return null;
  };

  // Calculate SVG viewBox
  const calculateViewBox = (): string => {
    if (!graph) {
      return "0 0 800 600";
    }

    // Find bounds of all visible nodes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const updateBounds = (nodes: ComponentNode[]) => {
      nodes.forEach((node) => {
        if (isNodeVisible(node, graph.nodes)) {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          maxX = Math.max(maxX, node.position.x + node.size.width);
          maxY = Math.max(maxY, node.position.y + node.size.height);

          if (expandedComponents[node.id] && node.children.length > 0) {
            updateBounds(node.children);
          }
        }
      });
    };

    updateBounds(graph.nodes);

    // Add padding
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    return `${minX - padding} ${minY - padding} ${width} ${height}`;
  };

  if (!graph) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-gray-500">Loading component diagram...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              const allExpanded: ExpandedState = {};
              const expandAll = (nodes: ComponentNode[]) => {
                nodes.forEach((node) => {
                  if (node.children.length > 0) {
                    allExpanded[node.id] = true;
                    expandAll(node.children);
                  }
                });
              };
              expandAll(graph.nodes);
              setExpandedComponents(allExpanded);
              persistExpandedComponents(allExpanded);
            }}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={() => {
              const collapsed = {};
              setExpandedComponents(collapsed);
              persistExpandedComponents(collapsed);
            }}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
          >
            Collapse All
          </button>
          <button
            onClick={() => {
              setHighlightedComponent(null);
              if (builderRef.current) {
                builderRef.current.clearHighlight();
              }
            }}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
          >
            Clear Selection
          </button>
        </div>

        <div className="text-xs text-gray-500">
          Click components to select • Click +/− to expand/collapse
        </div>
      </div>

      {/* SVG Diagram */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-auto">
        <svg
          ref={svgRef}
          viewBox={calculateViewBox()}
          className="w-full h-auto"
          style={{ minHeight: "400px" }}
        >
          {/* Define arrowhead marker */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill="#4A90E2" />
            </marker>
          </defs>

          {/* Render edges first (so they appear behind nodes) */}
          <g>
            {graph.edges.map((edge) => renderEdge(edge, graph.nodes))}
          </g>

          {/* Render nodes */}
          <g>
            {graph.nodes.map((node) =>
              renderComponent(node, expandedComponents[node.id] ?? true),
            )}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm font-medium text-gray-700 mb-2">Component Types:</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { type: "env" as const, label: "Environment" },
            { type: "agent" as const, label: "Agent" },
            { type: "driver" as const, label: "Driver" },
            { type: "monitor" as const, label: "Monitor" },
            { type: "sequencer" as const, label: "Sequencer" },
            { type: "scoreboard" as const, label: "Scoreboard" },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded"
                style={{ backgroundColor: getComponentColor(type) }}
              />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComponentDiagram;
