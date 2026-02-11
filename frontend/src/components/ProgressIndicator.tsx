/**
 * Progress Indicator Component
 * Displays animated progress indicators for simulation running state
 */

import React, { useEffect, useState } from "react";
import { useSimulation } from "../contexts/SimulationContext";

interface ProgressIndicatorProps {
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  className = "",
}) => {
  const { isRunning, currentTime, cycleCount, phase } = useSimulation();
  const [animationFrame, setAnimationFrame] = useState(0);

  // Update animation frame when simulation is running
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    let frameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      
      // Update animation frame every 100ms
      if (deltaTime >= 100) {
        setAnimationFrame((prev) => (prev + 1) % 4);
        lastTime = currentTime;
      }

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isRunning]);

  // Get phase color
  const getPhaseColor = () => {
    switch (phase) {
      case "reset":
        return "bg-gray-500";
      case "stimulus":
        return "bg-blue-500";
      case "checking":
        return "bg-amber-500";
      case "complete":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  // Get phase label
  const getPhaseLabel = () => {
    switch (phase) {
      case "reset":
        return "Reset";
      case "stimulus":
        return "Stimulus";
      case "checking":
        return "Checking";
      case "complete":
        return "Complete";
      default:
        return "Unknown";
    }
  };

  // Animated dots for running state
  const getAnimatedDots = () => {
    const dots = [".", "..", "...", ""];
    return dots[animationFrame];
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center space-x-2">
        {isRunning ? (
          <>
            <div className="relative">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Running{getAnimatedDots()}
            </span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Paused
            </span>
          </>
        )}
      </div>

      {/* Phase Indicator */}
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${getPhaseColor()}`}></div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Phase: <span className="font-medium">{getPhaseLabel()}</span>
        </span>
      </div>

      {/* Time Display */}
      <div className="flex items-center space-x-2">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Time: <span className="font-mono font-medium">{currentTime.toFixed(2)}</span>
        </span>
      </div>

      {/* Cycle Count Display */}
      <div className="flex items-center space-x-2">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Cycles: <span className="font-mono font-medium">{cycleCount}</span>
        </span>
      </div>

      {/* Progress Bar (when running) */}
      {isRunning && (
        <div className="flex-1 max-w-xs">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((currentTime / 1000) * 100, 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
