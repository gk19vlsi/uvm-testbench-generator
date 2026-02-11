/**
 * Simulation Controls Component
 * React component for controlling simulation playback
 * Provides play, pause, reset buttons, speed control, and status display
 */

import React, { useEffect, useState, useCallback } from "react";
import { SimulationEngine } from "../services/SimulationEngine";
import { SimulationState } from "../types/simulation";

interface SimulationControlsProps {
  engine: SimulationEngine;
  className?: string;
}

const SimulationControls: React.FC<SimulationControlsProps> = ({
  engine,
  className = "",
}) => {
  const [state, setState] = useState<SimulationState>(engine.getState());
  const [speed, setSpeed] = useState<number>(1.0);

  // Subscribe to state updates
  useEffect(() => {
    const unsubscribe = engine.onStateUpdate((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(engine.getState());

    return () => {
      unsubscribe();
    };
  }, [engine]);

  // Handle play button
  const handlePlay = useCallback(() => {
    if (state.phase === "complete") {
      // Reset and start if simulation is complete
      engine.reset();
      engine.start();
    } else {
      engine.start();
    }
  }, [engine, state.phase]);

  // Handle pause button
  const handlePause = useCallback(() => {
    engine.pause();
  }, [engine]);

  // Handle reset button
  const handleReset = useCallback(() => {
    engine.reset();
  }, [engine]);

  // Handle speed change
  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed);
      engine.setSpeed(newSpeed);
    },
    [engine],
  );

  // Get phase color
  const getPhaseColor = (phase: SimulationState["phase"]): string => {
    const colors: Record<SimulationState["phase"], string> = {
      reset: "bg-yellow-100 text-yellow-800 border-yellow-300",
      stimulus: "bg-blue-100 text-blue-800 border-blue-300",
      checking: "bg-purple-100 text-purple-800 border-purple-300",
      complete: "bg-green-100 text-green-800 border-green-300",
    };
    return colors[phase];
  };

  // Get phase icon
  const getPhaseIcon = (phase: SimulationState["phase"]): JSX.Element => {
    switch (phase) {
      case "reset":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "stimulus":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        );
      case "checking":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "complete":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // Speed presets
  const speedPresets = [0.25, 0.5, 1.0, 2.0, 4.0];

  return (
    <div className={`flex flex-col space-y-3 ${className}`}>
      {/* Playback Controls */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Resume Button */}
            <button
              onClick={handlePlay}
              disabled={state.isRunning}
              className={`p-2 rounded-lg transition-colors ${
                state.isRunning
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
              title={state.phase === "complete" ? "Restart" : "Play"}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Pause Button */}
            <button
              onClick={handlePause}
              disabled={!state.isRunning}
              className={`p-2 rounded-lg transition-colors ${
                !state.isRunning
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-yellow-500 text-white hover:bg-yellow-600"
              }`}
              title="Pause"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              title="Reset"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Running Indicator */}
            {state.isRunning && (
              <div className="flex items-center space-x-2 ml-2">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Running</span>
              </div>
            )}
          </div>

          {/* Status Display */}
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <span className="text-gray-600">Time:</span>
              <span className="ml-1 font-mono font-medium text-gray-900">
                {state.currentTime.toFixed(2)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Cycles:</span>
              <span className="ml-1 font-mono font-medium text-gray-900">
                {state.cycleCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Speed Control */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">
            Simulation Speed
          </label>
          <span className="text-sm font-mono font-medium text-gray-900">
            {speed}x
          </span>
        </div>

        {/* Speed Presets */}
        <div className="flex items-center space-x-2 mb-2">
          {speedPresets.map((preset) => (
            <button
              key={preset}
              onClick={() => handleSpeedChange(preset)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                speed === preset
                  ? "bg-blue-500 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
              }`}
            >
              {preset}x
            </button>
          ))}
        </div>

        {/* Speed Slider */}
        <input
          type="range"
          min="0.1"
          max="5.0"
          step="0.1"
          value={speed}
          onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.1x</span>
          <span>5.0x</span>
        </div>
      </div>

      {/* Phase Display */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Current Phase:
          </span>
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-lg border ${getPhaseColor(state.phase)}`}
          >
            {getPhaseIcon(state.phase)}
            <span className="text-sm font-medium capitalize">
              {state.phase}
            </span>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      {state.events.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Recent Events ({state.events.length})
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {state.events.slice(-5).map((event, index) => (
              <div
                key={index}
                className={`text-xs p-2 rounded ${
                  event.severity === "error"
                    ? "bg-red-50 text-red-700"
                    : event.severity === "warning"
                      ? "bg-yellow-50 text-yellow-700"
                      : "bg-blue-50 text-blue-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{event.type}</span>
                  <span className="font-mono">{event.time.toFixed(2)}</span>
                </div>
                <div className="mt-1">{event.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationControls;
