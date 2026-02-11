/**
 * WaveformDisplay Component Usage Example
 * Demonstrates how to use the WaveformDisplay component
 */

import React from "react";
import WaveformDisplay from "./WaveformDisplay";
import { Signal, SignalData } from "../types/simulation";

/**
 * Example usage of WaveformDisplay component
 */
const WaveformDisplayExample: React.FC = () => {
  // Define signals to display
  const signals: Signal[] = [
    {
      id: "clk",
      name: "clock",
      type: "clock",
      color: "#00FF00",
      bitWidth: 1,
    },
    {
      id: "reset",
      name: "reset_n",
      type: "control",
      color: "#FF00FF",
      bitWidth: 1,
    },
    {
      id: "data",
      name: "data_bus",
      type: "data",
      color: "#FF0000",
      bitWidth: 8,
    },
  ];

  // Define signal data with transitions
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
      ],
    },
    {
      signalId: "reset",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ],
    },
    {
      signalId: "data",
      transitions: [
        { time: 0, value: 0 },
        { time: 10, value: 0x42 },
        { time: 20, value: 0xff },
        { time: 30, value: 0x00 },
      ],
    },
  ];

  // Handle time range selection
  const handleTimeRangeSelect = (startTime: number, endTime: number) => {
    console.log(`Selected time range: ${startTime} - ${endTime}`);
    // You can use this to update other parts of your UI
    // or trigger additional actions based on the selection
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Waveform Display Example</h1>

      <div className="mb-4 text-sm text-gray-600">
        <p>This example demonstrates the WaveformDisplay component with:</p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Clock signal (green)</li>
          <li>Reset signal (magenta)</li>
          <li>Data bus signal (red)</li>
        </ul>
        <p className="mt-2">
          Try the following interactions:
        </p>
        <ul className="list-disc list-inside ml-4 mt-2">
          <li>Click zoom in/out buttons to change the time scale</li>
          <li>Drag on the waveform to pan left/right</li>
          <li>Hold Shift and drag to select a time range</li>
          <li>Scroll with mouse wheel to zoom</li>
          <li>Hover over signals to see time and value information</li>
        </ul>
      </div>

      <WaveformDisplay
        signals={signals}
        signalData={signalData}
        onTimeRangeSelect={handleTimeRangeSelect}
        className="border border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default WaveformDisplayExample;
