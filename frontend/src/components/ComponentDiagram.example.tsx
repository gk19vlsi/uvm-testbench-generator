/**
 * ComponentDiagram Component Usage Example
 * Demonstrates how to use the ComponentDiagram component
 */

import React, { useState } from "react";
import ComponentDiagram from "./ComponentDiagram";
import { TestbenchSpecification, ComponentNode } from "../types/simulation";

/**
 * Example usage of ComponentDiagram component
 */
const ComponentDiagramExample: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<ComponentNode | null>(null);

  // Define a sample testbench specification
  const specification: TestbenchSpecification = {
    rtl: {
      moduleName: "alu",
      ports: [
        { name: "clk", direction: "input", width: 1 },
        { name: "a", direction: "input", width: 8 },
        { name: "b", direction: "input", width: 8 },
        { name: "result", direction: "output", width: 8 },
      ],
    },
    verification: {
      testCases: [
        { name: "smoke_test", description: "Basic functionality test" },
        { name: "random_test", description: "Random stimulus test" },
      ],
      coverageGoals: [
        { name: "functional_coverage", target: 100 },
      ],
    },
    components: [
      {
        id: "env_1",
        type: "env",
        name: "alu_env",
        children: [
          {
            id: "agent_1",
            type: "agent",
            name: "alu_agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "alu_driver",
                properties: {
                  protocol: "custom",
                },
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "alu_monitor",
                properties: {
                  protocol: "custom",
                },
              },
              {
                id: "sequencer_1",
                type: "sequencer",
                name: "alu_sequencer",
              },
            ],
            properties: {
              active: true,
            },
          },
          {
            id: "scoreboard_1",
            type: "scoreboard",
            name: "alu_scoreboard",
            properties: {
              checkingEnabled: true,
            },
          },
        ],
        properties: {
          hasScoreboard: true,
        },
      },
    ],
    signals: [
      { name: "clk", type: "clock", bitWidth: 1 },
      { name: "a", type: "data", bitWidth: 8 },
      { name: "b", type: "data", bitWidth: 8 },
      { name: "result", type: "data", bitWidth: 8 },
    ],
    clocks: [
      {
        name: "clk",
        period: 10,
        dutyCycle: 0.5,
        phase: 0,
      },
    ],
  };

  // Handle component click
  const handleComponentClick = (component: ComponentNode) => {
    console.log("Component clicked:", component);
    setSelectedComponent(component);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Component Diagram Example</h1>

      <div className="mb-4 text-sm text-gray-600">
        <p>This example demonstrates the ComponentDiagram component with:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Hierarchical UVM component structure</li>
          <li>Environment containing an agent and scoreboard</li>
          <li>Agent containing driver, monitor, and sequencer</li>
          <li>Visual connections between components</li>
        </ul>
        <p className="mt-2">Try the following interactions:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Click on any component to select it</li>
          <li>Click the +/− buttons to expand/collapse hierarchical components</li>
          <li>Use "Expand All" or "Collapse All" buttons</li>
          <li>Hover over components to see visual feedback</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Component Diagram */}
        <div className="lg:col-span-2">
          <ComponentDiagram
            specification={specification}
            onComponentClick={handleComponentClick}
            className="border border-gray-300 rounded-lg"
          />
        </div>

        {/* Component Details Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-3">Component Details</h2>

            {selectedComponent ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Name:
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedComponent.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Type:
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedComponent.type}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    ID:
                  </label>
                  <p className="text-sm text-gray-900 font-mono">
                    {selectedComponent.id}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Position:
                  </label>
                  <p className="text-sm text-gray-900">
                    x: {selectedComponent.position.x}, y:{" "}
                    {selectedComponent.position.y}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Size:
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedComponent.size.width} ×{" "}
                    {selectedComponent.size.height}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Children:
                  </label>
                  <p className="text-sm text-gray-900">
                    {selectedComponent.children.length} component(s)
                  </p>
                </div>

                {Object.keys(selectedComponent.properties).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Properties:
                    </label>
                    <div className="mt-1 space-y-1">
                      {Object.entries(selectedComponent.properties).map(
                        ([key, value]) => (
                          <div
                            key={key}
                            className="text-sm text-gray-900 flex items-start"
                          >
                            <span className="font-medium mr-2">{key}:</span>
                            <span className="break-words">
                              {typeof value === "object"
                                ? JSON.stringify(value)
                                : String(value)}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Click on a component to view its details
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentDiagramExample;
