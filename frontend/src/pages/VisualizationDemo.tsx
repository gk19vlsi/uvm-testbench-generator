/**
 * Visualization Demo Page
 * Standalone page to preview the visualization features
 */

import React from "react";
import VisualizationPanel from "../components/VisualizationPanel";
import { TestbenchSpecification, Signal, SignalData } from "../types/simulation";

const VisualizationDemo: React.FC = () => {
  // Sample specification
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
      testCases: ["basic_ops", "edge_cases"],
      coverageGoals: ["functional", "code"],
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
                children: [],
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "alu_monitor",
                children: [],
              },
              {
                id: "sequencer_1",
                type: "sequencer",
                name: "alu_sequencer",
                children: [],
              },
            ],
          },
          {
            id: "scoreboard_1",
            type: "scoreboard",
            name: "alu_scoreboard",
            children: [],
          },
        ],
      },
    ],
    signals: [
      { name: "clk", type: "clock", width: 1 },
      { name: "a", type: "data", width: 8 },
      { name: "b", type: "data", width: 8 },
      { name: "result", type: "data", width: 8 },
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

  // Sample signals
  const signals: Signal[] = [
    {
      id: "clk",
      name: "clk",
      type: "clock",
      color: "#22c55e",
      bitWidth: 1,
    },
    {
      id: "a",
      name: "a[7:0]",
      type: "data",
      color: "#3b82f6",
      bitWidth: 8,
    },
    {
      id: "b",
      name: "b[7:0]",
      type: "data",
      color: "#3b82f6",
      bitWidth: 8,
    },
    {
      id: "result",
      name: "result[7:0]",
      type: "data",
      color: "#3b82f6",
      bitWidth: 8,
    },
  ];

  // Sample signal data with transitions
  const signalData: SignalData[] = [
    {
      signalId: "clk",
      transitions: [
        { time: 0, value: 0 },
        { time: 5, value: 1 },
        { time: 10, value: 0 },
        { time: 15, value: 1 },
        { time: 20, value: 0 },
        { time: 25, value: 1 },
        { time: 30, value: 0 },
        { time: 35, value: 1 },
        { time: 40, value: 0 },
        { time: 45, value: 1 },
        { time: 50, value: 0 },
      ],
    },
    {
      signalId: "a",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 15 },
        { time: 20, value: 32 },
        { time: 30, value: 128 },
        { time: 40, value: 255 },
      ],
    },
    {
      signalId: "b",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 7 },
        { time: 20, value: 16 },
        { time: 30, value: 64 },
        { time: 40, value: 127 },
      ],
    },
    {
      signalId: "result",
      transitions: [
        { time: 0, value: 0 },
        { time: 12, value: 22 },
        { time: 22, value: 48 },
        { time: 32, value: 192 },
        { time: 42, value: 382 },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Simulation Visualization Demo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Interactive preview of the simulation visualization features
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <VisualizationPanel
          projectId="demo-project"
          specification={specification}
          signals={signals}
          signalData={signalData}
        />

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            How to Use
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Click the <strong>Play</strong> button to start the simulation</li>
            <li>• Use the <strong>tabs</strong> to switch between Waveform, Component Diagram, and Timeline views</li>
            <li>• In Waveform view: <strong>scroll to zoom</strong>, <strong>drag to pan</strong>, <strong>Shift+drag to select</strong></li>
            <li>• In Component Diagram: <strong>click +/−</strong> to expand/collapse, <strong>click components</strong> to select</li>
            <li>• Adjust <strong>simulation speed</strong> with the slider</li>
            <li>• Try switching between <strong>light and dark themes</strong> (if your app supports it)</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default VisualizationDemo;
