/**
 * Waveform Renderer
 * Renders clock and signal waveforms using Canvas API for high performance
 */

import {
  Signal,
  SignalData,
  ViewTransform,
  WaveformConfig,
  SignalValue,
} from "../types/simulation";
import { SignalTimeSeries } from "./SignalTimeSeries";
import { ColorPaletteService, Theme } from "./ColorPalette";

/**
 * WaveformRenderer class
 * Responsible for rendering waveforms on a canvas element
 */
export class WaveformRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private config: WaveformConfig;
  private signals: Map<string, Signal> = new Map();
  private signalData: Map<string, SignalTimeSeries> = new Map();
  private viewTransform: ViewTransform;
  private colorPalette: ColorPaletteService;

  constructor(theme: Theme = "light") {
    this.colorPalette = new ColorPaletteService(theme);

    this.config = {
      width: 800,
      height: 600,
      timeScale: 10, // 10 pixels per time unit
      signalHeight: 60,
      backgroundColor: this.colorPalette.getBackgroundColor(),
      gridColor: this.colorPalette.getGridColor(),
      showGrid: true,
    };

    this.viewTransform = {
      offsetX: 0,
      offsetY: 0,
      scaleX: 1.0,
      scaleY: 1.0,
    };
  }

  /**
   * Initialize the renderer with canvas context
   */
  initialize(
    canvas: HTMLCanvasElement,
    config?: Partial<WaveformConfig>,
  ): void {
    this.canvas = canvas;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Failed to get 2D context from canvas");
    }

    this.ctx = context;

    // Update config if provided
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Set canvas size
    this.canvas.width = this.config.width;
    this.canvas.height = this.config.height;
  }

  /**
   * Add a signal to be displayed
   */
  addSignal(signal: Signal): void {
    // Assign color from palette if not already set
    const signalWithColor = {
      ...signal,
      color: signal.color || this.colorPalette.getColorForSignal(signal),
    };

    this.signals.set(signalWithColor.id, signalWithColor);

    // Initialize empty time series if not exists
    if (!this.signalData.has(signalWithColor.id)) {
      this.signalData.set(
        signalWithColor.id,
        new SignalTimeSeries(signalWithColor.id),
      );
    }
  }

  /**
   * Remove a signal from display
   */
  removeSignal(signalId: string): void {
    this.signals.delete(signalId);
    this.signalData.delete(signalId);
  }

  /**
   * Update waveform data for a specific time range
   */
  updateData(timeStart: number, timeEnd: number, data: SignalData[]): void {
    data.forEach((signalData) => {
      let timeSeries = this.signalData.get(signalData.signalId);

      if (!timeSeries) {
        timeSeries = new SignalTimeSeries(signalData.signalId);
        this.signalData.set(signalData.signalId, timeSeries);
      }

      // Add transitions within the time range
      const transitions = signalData.transitions.filter(
        (t) => t.time >= timeStart && t.time <= timeEnd,
      );
      timeSeries.addTransitions(transitions);
    });
  }

  /**
   * Render the current view
   */
  render(): void {
    if (!this.ctx || !this.canvas) {
      return;
    }

    // Clear canvas
    this.ctx.fillStyle = this.config.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid if enabled
    if (this.config.showGrid) {
      this.drawGrid();
    }

    // Draw signals
    this.drawSignals();

    // Draw time markers
    this.drawTimeMarkers();
  }

  /**
   * Transform view (zoom/pan)
   */
  setViewTransform(transform: ViewTransform): void {
    this.viewTransform = { ...transform };
  }

  /**
   * Get signal value at specific time
   */
  getValueAtTime(signalId: string, time: number): SignalValue | null {
    const timeSeries = this.signalData.get(signalId);
    if (!timeSeries) {
      return null;
    }

    return timeSeries.getValueAt(time);
  }

  /**
   * Convert time to canvas X coordinate
   */
  private timeToX(time: number): number {
    return (
      time * this.config.timeScale * this.viewTransform.scaleX +
      this.viewTransform.offsetX
    );
  }

  /**
   * Convert canvas X coordinate to time
   */
  xToTime(x: number): number {
    return (
      (x - this.viewTransform.offsetX) /
      (this.config.timeScale * this.viewTransform.scaleX)
    );
  }

  /**
   * Draw grid lines
   */
  private drawGrid(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.strokeStyle = this.config.gridColor;
    this.ctx.lineWidth = 1;

    // Vertical grid lines (time)
    const timeStep = 10; // Grid line every 10 time units
    const startTime = Math.floor(this.xToTime(0) / timeStep) * timeStep;
    const endTime =
      Math.ceil(this.xToTime(this.canvas.width) / timeStep) * timeStep;

    for (let time = startTime; time <= endTime; time += timeStep) {
      const x = this.timeToX(time);
      if (x >= 0 && x <= this.canvas.width) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.canvas.height);
        this.ctx.stroke();
      }
    }

    // Horizontal grid lines (signals)
    const signalCount = this.signals.size;
    for (let i = 0; i <= signalCount; i++) {
      const y = i * this.config.signalHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw all signals
   */
  private drawSignals(): void {
    if (!this.ctx || !this.canvas) return;

    const signalArray = Array.from(this.signals.values());
    const startTime = this.xToTime(0);
    const endTime = this.xToTime(this.canvas.width);

    signalArray.forEach((signal, index) => {
      const y = index * this.config.signalHeight;
      this.drawSignal(signal, y, startTime, endTime);
    });
  }

  /**
   * Draw a single signal
   */
  private drawSignal(
    signal: Signal,
    yOffset: number,
    startTime: number,
    endTime: number,
  ): void {
    if (!this.ctx) return;

    const timeSeries = this.signalData.get(signal.id);
    if (!timeSeries) return;

    // Draw signal name
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.font = "12px monospace";
    this.ctx.fillText(signal.name, 5, yOffset + 15);

    // Get transitions in visible range
    const transitions = timeSeries.getTransitionsInRange(startTime, endTime);
    if (transitions.length === 0) return;

    // Draw waveform
    this.ctx.strokeStyle = signal.color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();

    const signalTopY = yOffset + 10;
    const signalBottomY = yOffset + this.config.signalHeight - 10;

    // Get initial value (value at startTime)
    let currentValue = timeSeries.getValueAt(startTime);
    let currentX = this.timeToX(startTime);
    let currentY = this.getYForValue(currentValue, signalTopY, signalBottomY);

    this.ctx.moveTo(currentX, currentY);

    // Draw each transition
    transitions.forEach((transition) => {
      if (!this.ctx) return;

      const nextX = this.timeToX(transition.time);
      const nextValue = this.convertToSignalValue(transition.value);
      const nextY = this.getYForValue(nextValue, signalTopY, signalBottomY);

      // Draw horizontal line to transition point
      this.ctx.lineTo(nextX, currentY);

      // Draw vertical transition
      this.ctx.lineTo(nextX, nextY);

      currentX = nextX;
      currentY = nextY;
      currentValue = nextValue;
    });

    // Draw to end of visible area
    const endX = this.timeToX(endTime);
    this.ctx.lineTo(endX, currentY);

    this.ctx.stroke();
  }

  /**
   * Get Y coordinate for a signal value
   */
  private getYForValue(
    value: SignalValue,
    topY: number,
    bottomY: number,
  ): number {
    if (value.isUnknown) {
      return (topY + bottomY) / 2; // Middle for unknown
    }

    // For binary values
    if (value.type === "binary") {
      const numValue =
        typeof value.value === "number"
          ? value.value
          : parseInt(value.value.toString(), 2);
      return numValue === 0 ? bottomY : topY;
    }

    // For other types, use middle
    return (topY + bottomY) / 2;
  }

  /**
   * Convert transition value to SignalValue
   */
  private convertToSignalValue(value: string | number): SignalValue {
    if (value === "X" || value === "Z" || value === "x" || value === "z") {
      return {
        type: "binary",
        value: value.toString().toUpperCase(),
        isUnknown: true,
      };
    }

    if (typeof value === "number") {
      return {
        type: "decimal",
        value,
        isUnknown: false,
      };
    }

    const strValue = value.toString();
    if (strValue.startsWith("0x") || strValue.startsWith("0X")) {
      return {
        type: "hex",
        value: strValue,
        isUnknown: false,
      };
    }

    return {
      type: "binary",
      value: strValue,
      isUnknown: false,
    };
  }

  /**
   * Draw time markers
   */
  private drawTimeMarkers(): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = "#AAAAAA";
    this.ctx.font = "10px monospace";

    const timeStep = 10;
    const startTime = Math.floor(this.xToTime(0) / timeStep) * timeStep;
    const endTime =
      Math.ceil(this.xToTime(this.canvas.width) / timeStep) * timeStep;

    for (let time = startTime; time <= endTime; time += timeStep) {
      const x = this.timeToX(time);
      if (x >= 0 && x <= this.canvas.width) {
        this.ctx.fillText(time.toString(), x + 2, 10);
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): WaveformConfig {
    return { ...this.config };
  }

  /**
   * Get current view transform
   */
  getViewTransform(): ViewTransform {
    return { ...this.viewTransform };
  }

  /**
   * Get all signals
   */
  getSignals(): Signal[] {
    return Array.from(this.signals.values());
  }

  /**
   * Get time and signal information at canvas position
   * Used for hover tooltips
   */
  getInfoAtPosition(
    x: number,
    y: number,
  ): {
    time: number;
    signal: Signal | null;
    value: SignalValue | null;
  } {
    const time = this.xToTime(x);

    // Determine which signal is at this Y position
    const signalIndex = Math.floor(y / this.config.signalHeight);
    const signalArray = Array.from(this.signals.values());

    if (signalIndex < 0 || signalIndex >= signalArray.length) {
      return { time, signal: null, value: null };
    }

    const signal = signalArray[signalIndex];
    const value = this.getValueAtTime(signal.id, time);

    return { time, signal, value };
  }

  /**
   * Draw cursor line at X position
   * Used for hover feedback
   */
  drawCursor(x: number): void {
    if (!this.ctx || !this.canvas) return;

    this.ctx.strokeStyle = "#FFFF00";
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(x, 0);
    this.ctx.lineTo(x, this.canvas.height);
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  /**
   * Set theme and update colors
   */
  setTheme(theme: Theme): void {
    this.colorPalette.setTheme(theme);

    // Update config colors
    this.config.backgroundColor = this.colorPalette.getBackgroundColor();
    this.config.gridColor = this.colorPalette.getGridColor();

    // Update signal colors
    this.signals.forEach((signal) => {
      signal.color = this.colorPalette.getColorForSignal(signal);
    });
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.colorPalette.getTheme();
  }

  /**
   * Get color palette service
   */
  getColorPalette(): ColorPaletteService {
    return this.colorPalette;
  }
}
