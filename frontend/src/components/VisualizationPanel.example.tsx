/**
 * Visualization Panel Example
 * Demonstrates how to integrate the visualization panel into your application
 */

import React from "react";
import VisualizationPanel from "./VisualizationPanel";
import { TestbenchSpecification, Signal, SignalData } from "../types/simulation";

/**
 * Example: Basic Integration
 */
export const BasicExample: React.FC = () => {
  // Example specification
  const specification: TestbenchSpecification = {
    rtl: {
      moduleName: "example_module",
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
        name: "test_env",
        children: [
          {
            id: "agent_1",
            type: "agent",
            name: "test_agent",
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

  // Example signals
  const signals: Signal[] = [
    {
      id: "clk",
      name: "clock",
      type: "clock",
      color: "#22c55e",
      bitWidth: 1,
    },
    {
      id: "data",
      name: "data_bus",
      type: "data",
      color: "#3b82f6",
      bitWidth: 8,
    },
  ];

  // Example signal data
  const signalData: SignalData[] = [
    {
      signalId: "clk",
      transitions: [
        { time: 0, value: 0 },
        { time: 5, value: 1 },
        { time: 10, value: 0 },
        { time: 15, value: 1 },
        { time: 20, value: 0 },
      ],
    },
    {
      signalId: "data",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 255 },
        { time: 20, value: 128 },
      ],
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Visualization Panel Example</h1>
      <VisualizationPanel
        projectId="example-project"
        specification={specification}
        signals={signals}
        signalData={signalData}
      />
    </div>
  );
};

/**
 * Example: Integration with Generation Interface
 */
export const GenerationInterfaceExample: React.FC<{
  projectId: string;
  generationComplete: boolean;
}> = ({ projectId, generationComplete }) => {
  // In a real application, you would fetch this data from your backend
  const [specification, setSpecification] = React.useState<TestbenchSpecification | null>(null);
  const [signals, setSignals] = React.useState<Signal[]>([]);
  const [signalData, setSignalData] = React.useState<SignalData[]>([]);

  React.useEffect(() => {
    if (generationComplete) {
      // Fetch specification and signal data from backend
      // This is where you would integrate with your testbench generation API
      fetchVisualizationData(projectId).then((data) => {
        setSpecification(data.specification);
        setSignals(data.signals);
        setSignalData(data.signalData);
      });
    }
  }, [projectId, generationComplete]);

  if (!generationComplete || !specification) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">
          Generate a testbench to see visualization
        </p>
      </div>
    );
  }

  return (
    <VisualizationPanel
      projectId={projectId}
      specification={specification}
      signals={signals}
      signalData={signalData}
    />
  );
};

// Mock function - replace with actual API call
async function fetchVisualizationData(projectId: string) {
  // This would be replaced with actual API call
  return {
    specification: {} as TestbenchSpecification,
    signals: [] as Signal[],
    signalData: [] as SignalData[],
  };
}

/**
 * Example: Standalone Visualization
 */
export const StandaloneExample: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <BasicExample />
      </div>
    </div>
  );
};

export default BasicExample;
