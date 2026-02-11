/**
 * Waveform Display Component
 * React wrapper for WaveformRenderer with interactive controls
 * Provides zoom, pan, and time range selection capabilities
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { WaveformRenderer } from "../services/WaveformRenderer";
import {
  Signal,
  SignalData,
  ViewTransform,
  WaveformConfig,
  SignalValue,
} from "../types/simulation";
import { useSimulation } from "../contexts/SimulationContext";

interface WaveformDisplayProps {
  signals: Signal[];
  signalData: SignalData[];
  config?: Partial<WaveformConfig>;
  onTimeRangeSelect?: (startTime: number, endTime: number) => void;
  className?: string;
}

interface TimeRange {
  start: number;
  end: number;
}

const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  signals,
  signalData,
  config,
  onTimeRangeSelect,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<WaveformRenderer | null>(null);

  // Get persisted settings from context
  const {
    viewTransform: persistedTransform,
    setViewTransform: persistViewTransform,
    theme,
  } = useSimulation();

  const [viewTransform, setViewTransform] = useState<ViewTransform>(persistedTransform);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [selectedRange, setSelectedRange] = useState<TimeRange | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{
    time: number;
    signal: Signal | null;
    value: SignalValue | null;
    x: number;
    y: number;
  } | null>(null);

  // Sync local viewTransform with persisted settings
  useEffect(() => {
    setViewTransform(persistedTransform);
  }, [persistedTransform]);

  // Update renderer theme when theme changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setTheme(theme);
      rendererRef.current.render();
    }
  }, [theme]);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new WaveformRenderer(theme);
    const canvas = canvasRef.current;

    // Set canvas size from container
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    renderer.initialize(canvas, config);
    rendererRef.current = renderer;

    // Add signals
    signals.forEach((signal) => renderer.addSignal(signal));

    // Update data
    if (signalData.length > 0) {
      const times = signalData.flatMap((sd) =>
        sd.transitions.map((t) => t.time),
      );
      const minTime = Math.min(...times, 0);
      const maxTime = Math.max(...times, 100);
      renderer.updateData(minTime, maxTime, signalData);
    }

    // Initial render
    renderer.render();

    return () => {
      // Cleanup
      rendererRef.current = null;
    };
  }, [theme]);

  // Update signals when they change
  useEffect(() => {
    if (!rendererRef.current) return;

    const renderer = rendererRef.current;
    const currentSignals = renderer.getSignals();

    // Remove signals that are no longer in the list
    currentSignals.forEach((signal) => {
      if (!signals.find((s) => s.id === signal.id)) {
        renderer.removeSignal(signal.id);
      }
    });

    // Add new signals
    signals.forEach((signal) => {
      if (!currentSignals.find((s) => s.id === signal.id)) {
        renderer.addSignal(signal);
      }
    });

    renderer.render();
  }, [signals]);

  // Update data when it changes
  useEffect(() => {
    if (!rendererRef.current || signalData.length === 0) return;

    const times = signalData.flatMap((sd) => sd.transitions.map((t) => t.time));
    const minTime = Math.min(...times, 0);
    const maxTime = Math.max(...times, 100);

    rendererRef.current.updateData(minTime, maxTime, signalData);
    rendererRef.current.render();
  }, [signalData]);

  // Update view transform
  useEffect(() => {
    if (!rendererRef.current) return;

    rendererRef.current.setViewTransform(viewTransform);
    rendererRef.current.render();
  }, [viewTransform]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    const newTransform = {
      ...viewTransform,
      scaleX: Math.min(viewTransform.scaleX * 1.5, 10.0),
    };
    setViewTransform(newTransform);
    persistViewTransform(newTransform);
  }, [viewTransform, persistViewTransform]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    const newTransform = {
      ...viewTransform,
      scaleX: Math.max(viewTransform.scaleX / 1.5, 0.1),
    };
    setViewTransform(newTransform);
    persistViewTransform(newTransform);
  }, [viewTransform, persistViewTransform]);

  // Handle zoom reset
  const handleZoomReset = useCallback(() => {
    const newTransform = {
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
    };
    setViewTransform(newTransform);
    persistViewTransform(newTransform);
  }, [persistViewTransform]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScaleX = Math.max(
        0.1,
        Math.min(10.0, viewTransform.scaleX * zoomFactor),
      );

      const newTransform = {
        ...viewTransform,
        scaleX: newScaleX,
      };
      setViewTransform(newTransform);
      persistViewTransform(newTransform);
    },
    [viewTransform, persistViewTransform],
  );

  // Handle mouse down for panning or selection
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (e.shiftKey) {
        // Start selection
        setIsSelecting(true);
        setSelectionStart(x);
        setSelectedRange(null);
      } else {
        // Start panning
        setIsPanning(true);
        setPanStart({ x, y });
      }
    },
    [],
  );

  // Handle mouse move for panning, selection, or hover
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const renderer = rendererRef.current;
      if (!canvas || !renderer) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (isPanning && panStart) {
        // Update pan offset
        const deltaX = x - panStart.x;
        const deltaY = y - panStart.y;

        const newTransform = {
          ...viewTransform,
          offsetX: viewTransform.offsetX + deltaX,
          offsetY: viewTransform.offsetY + deltaY,
        };
        setViewTransform(newTransform);
        persistViewTransform(newTransform);

        setPanStart({ x, y });
      } else if (isSelecting && selectionStart !== null) {
        // Update selection range
        const startTime = renderer.xToTime(Math.min(selectionStart, x));
        const endTime = renderer.xToTime(Math.max(selectionStart, x));
        setSelectedRange({ start: startTime, end: endTime });

        // Re-render with selection highlight
        renderer.render();
        drawSelectionOverlay(Math.min(selectionStart, x), Math.max(selectionStart, x));
      } else {
        // Update hover info
        const info = renderer.getInfoAtPosition(x, y);
        setHoverInfo({
          ...info,
          x: e.clientX,
          y: e.clientY,
        });

        // Draw cursor line
        renderer.render();
        renderer.drawCursor(x);
      }
    },
    [isPanning, panStart, isSelecting, selectionStart, viewTransform, persistViewTransform],
  );

  // Handle mouse up to end panning or selection
  const handleMouseUp = useCallback(() => {
    if (isSelecting && selectedRange && onTimeRangeSelect) {
      onTimeRangeSelect(selectedRange.start, selectedRange.end);
    }

    setIsPanning(false);
    setPanStart(null);
    setIsSelecting(false);
    setSelectionStart(null);
  }, [isPanning, isSelecting, selectedRange, onTimeRangeSelect]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
    setIsSelecting(false);
    setSelectionStart(null);
    setHoverInfo(null);

    // Re-render without cursor
    if (rendererRef.current) {
      rendererRef.current.render();
    }
  }, []);

  // Draw selection overlay
  const drawSelectionOverlay = useCallback((startX: number, endX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "rgba(100, 150, 255, 0.2)";
    ctx.fillRect(startX, 0, endX - startX, canvas.height);

    ctx.strokeStyle = "rgba(100, 150, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.lineTo(startX, canvas.height);
    ctx.moveTo(endX, 0);
    ctx.lineTo(endX, canvas.height);
    ctx.stroke();
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      const renderer = rendererRef.current;

      if (!canvas || !container || !renderer) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      renderer.initialize(canvas, config);
      signals.forEach((signal) => renderer.addSignal(signal));

      if (signalData.length > 0) {
        const times = signalData.flatMap((sd) =>
          sd.transitions.map((t) => t.time),
        );
        const minTime = Math.min(...times, 0);
        const maxTime = Math.max(...times, 100);
        renderer.updateData(minTime, maxTime, signalData);
      }

      renderer.setViewTransform(viewTransform);
      renderer.render();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [signals, signalData, config, viewTransform]);

  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      {/* Zoom Controls */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomIn}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
            title="Zoom In"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
              />
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
            title="Zoom Out"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
              />
            </svg>
          </button>
          <button
            onClick={handleZoomReset}
            className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
            title="Reset Zoom"
          >
            Reset
          </button>
          <div className="text-sm text-gray-600 ml-2">
            Zoom: {(viewTransform.scaleX * 100).toFixed(0)}%
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <span className="mr-4">Drag to pan</span>
          <span className="mr-4">Shift+Drag to select</span>
          <span>Scroll to zoom</span>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="relative bg-gray-900 rounded-lg overflow-hidden"
        style={{ height: "400px" }}
      >
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="cursor-crosshair"
        />

        {/* Hover Tooltip */}
        {hoverInfo && hoverInfo.signal && (
          <div
            className="absolute bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none z-10"
            style={{
              left: `${hoverInfo.x + 10}px`,
              top: `${hoverInfo.y + 10}px`,
            }}
          >
            <div className="font-medium">{hoverInfo.signal.name}</div>
            <div className="text-gray-300">
              Time: {hoverInfo.time.toFixed(2)}
            </div>
            {hoverInfo.value && (
              <div className="text-gray-300">
                Value:{" "}
                {hoverInfo.value.isUnknown
                  ? hoverInfo.value.value
                  : String(hoverInfo.value.value)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Range Display */}
      {selectedRange && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-sm">
          <span className="font-medium text-blue-900">Selected Range:</span>
          <span className="text-blue-700 ml-2">
            {selectedRange.start.toFixed(2)} - {selectedRange.end.toFixed(2)} (
            {(selectedRange.end - selectedRange.start).toFixed(2)} time units)
          </span>
        </div>
      )}
    </div>
  );
};

export default WaveformDisplay;
