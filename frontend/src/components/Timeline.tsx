/**
 * Timeline Component
 * Displays simulation timeline with time markers and phase indicators
 */

import React, { useRef, useEffect } from "react";
import { useSimulation } from "../contexts/SimulationContext";
import { SimulationState } from "../types/simulation";

interface TimelineProps {
  className?: string;
  height?: number;
}

const Timeline: React.FC<TimelineProps> = ({
  className = "",
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentTime, phase, events, isRunning } = useSimulation();

  // Draw timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = height;

    // Draw background
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw phase regions
    drawPhaseRegions(ctx, canvas.width, canvas.height, currentTime);

    // Draw time markers
    drawTimeMarkers(ctx, canvas.width, canvas.height, currentTime);

    // Draw current time indicator
    drawCurrentTimeIndicator(ctx, canvas.width, canvas.height, currentTime);

    // Draw events
    drawEvents(ctx, canvas.width, canvas.height, currentTime, events);
  }, [currentTime, phase, events, height, isRunning]);

  /**
   * Draw phase regions
   */
  const drawPhaseRegions = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
  ) => {
    const phases: Array<{
      name: SimulationState["phase"];
      startTime: number;
      endTime: number;
      color: string;
      label: string;
    }> = [
      { name: "reset", startTime: 0, endTime: 100, color: "#9ca3af", label: "Reset" },
      { name: "stimulus", startTime: 100, endTime: 500, color: "#3b82f6", label: "Stimulus" },
      { name: "checking", startTime: 500, endTime: 1000, color: "#f59e0b", label: "Checking" },
      { name: "complete", startTime: 1000, endTime: 1200, color: "#22c55e", label: "Complete" },
    ];

    const timeScale = width / 1200; // Scale to fit 1200 time units

    phases.forEach((phaseInfo) => {
      const startX = phaseInfo.startTime * timeScale;
      const endX = Math.min(phaseInfo.endTime * timeScale, currentTime * timeScale);

      if (endX > startX) {
        // Draw phase region
        ctx.fillStyle = phaseInfo.color + "20"; // 20% opacity
        ctx.fillRect(startX, 0, endX - startX, height);

        // Draw phase label
        if (currentTime >= phaseInfo.startTime) {
          ctx.fillStyle = phaseInfo.color;
          ctx.font = "10px sans-serif";
          ctx.fillText(phaseInfo.label, startX + 5, 15);
        }
      }
    });
  };

  /**
   * Draw time markers
   */
  const drawTimeMarkers = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
  ) => {
    const timeScale = width / 1200;
    const markerInterval = 100; // Marker every 100 time units

    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#6b7280";
    ctx.font = "9px monospace";

    for (let time = 0; time <= currentTime && time <= 1200; time += markerInterval) {
      const x = time * timeScale;

      // Draw marker line
      ctx.beginPath();
      ctx.moveTo(x, height - 20);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Draw time label
      ctx.fillText(time.toString(), x + 2, height - 5);
    }
  };

  /**
   * Draw current time indicator
   */
  const drawCurrentTimeIndicator = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
  ) => {
    const timeScale = width / 1200;
    const x = Math.min(currentTime * timeScale, width);

    // Draw vertical line
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 3]);

    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw time label
    ctx.fillStyle = "#ef4444";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`${currentTime.toFixed(1)}`, x + 5, 30);

    // Draw indicator triangle
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 5, 8);
    ctx.lineTo(x + 5, 8);
    ctx.closePath();
    ctx.fill();
  };

  /**
   * Draw events
   */
  const drawEvents = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    currentTime: number,
    events: SimulationState["events"],
  ) => {
    const timeScale = width / 1200;

    events.forEach((event) => {
      if (event.time > currentTime) return;

      const x = event.time * timeScale;

      // Get event color based on severity
      let color = "#3b82f6"; // info - blue
      if (event.severity === "warning") color = "#f59e0b"; // amber
      if (event.severity === "error") color = "#ef4444"; // red

      // Draw event marker
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw event line
      ctx.strokeStyle = color + "40"; // 40% opacity
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
    });
  };

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg"
        style={{ height: `${height}px` }}
      />
      
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-400 rounded"></div>
          <span>Reset</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Stimulus</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span>Checking</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Complete</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          <span>Current Time</span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
