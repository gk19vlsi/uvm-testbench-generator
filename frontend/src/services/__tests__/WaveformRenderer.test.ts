/**
 * Unit tests for WaveformRenderer
 */

import { WaveformRenderer } from "../WaveformRenderer";
import { Signal, SignalData } from "../../types/simulation";

// Mock canvas and context
class MockCanvasRenderingContext2D {
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 0;
  font = "";

  fillRect = jest.fn();
  strokeRect = jest.fn();
  beginPath = jest.fn();
  moveTo = jest.fn();
  lineTo = jest.fn();
  stroke = jest.fn();
  fillText = jest.fn();
  clearRect = jest.fn();
  setLineDash = jest.fn();
}

class MockHTMLCanvasElement {
  width = 0;
  height = 0;
  private context: MockCanvasRenderingContext2D;

  constructor() {
    this.context = new MockCanvasRenderingContext2D();
  }

  getContext(contextId: string): MockCanvasRenderingContext2D | null {
    if (contextId === "2d") {
      return this.context;
    }
    return null;
  }
}

describe("WaveformRenderer", () => {
  let renderer: WaveformRenderer;
  let canvas: MockHTMLCanvasElement;

  beforeEach(() => {
    renderer = new WaveformRenderer();
    canvas = new MockHTMLCanvasElement();
  });

  describe("initialize", () => {
    it("should initialize with canvas", () => {
      renderer.initialize(canvas as any);

      expect(canvas.width).toBeGreaterThan(0);
      expect(canvas.height).toBeGreaterThan(0);
    });

    it("should apply custom config", () => {
      renderer.initialize(canvas as any, {
        width: 1000,
        height: 800,
        timeScale: 20,
      });

      expect(canvas.width).toBe(1000);
      expect(canvas.height).toBe(800);

      const config = renderer.getConfig();
      expect(config.timeScale).toBe(20);
    });

    it("should throw error if context is not available", () => {
      const badCanvas = {
        getContext: () => null,
      } as any;

      expect(() => renderer.initialize(badCanvas)).toThrow(
        "Failed to get 2D context from canvas",
      );
    });
  });

  describe("addSignal", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should add a signal", () => {
      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      renderer.addSignal(signal);

      const signals = renderer.getSignals();
      expect(signals).toHaveLength(1);
      expect(signals[0].id).toBe("clk");
    });

    it("should add multiple signals", () => {
      const signal1: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      const signal2: Signal = {
        id: "data",
        name: "data",
        type: "data",
        color: "#00FF00",
        bitWidth: 32,
      };

      renderer.addSignal(signal1);
      renderer.addSignal(signal2);

      const signals = renderer.getSignals();
      expect(signals).toHaveLength(2);
    });
  });

  describe("removeSignal", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should remove a signal", () => {
      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      renderer.addSignal(signal);
      renderer.removeSignal("clk");

      const signals = renderer.getSignals();
      expect(signals).toHaveLength(0);
    });

    it("should not error when removing non-existent signal", () => {
      expect(() => renderer.removeSignal("nonexistent")).not.toThrow();
    });
  });

  describe("updateData", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);

      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      renderer.addSignal(signal);
    });

    it("should update signal data", () => {
      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
            { time: 20, value: 0 },
          ],
        },
      ];

      renderer.updateData(0, 100, data);

      const value = renderer.getValueAtTime("clk", 15);
      expect(value).not.toBeNull();
      expect(value!.value).toBe(1);
    });

    it("should filter transitions by time range", () => {
      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
            { time: 50, value: 0 },
            { time: 100, value: 1 },
          ],
        },
      ];

      renderer.updateData(10, 50, data);

      // Should have transitions at 10 and 50, but not 0 and 100
      const value1 = renderer.getValueAtTime("clk", 10);
      const value2 = renderer.getValueAtTime("clk", 50);

      expect(value1).not.toBeNull();
      expect(value2).not.toBeNull();
    });
  });

  describe("render", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should render without errors", () => {
      expect(() => renderer.render()).not.toThrow();
    });

    it("should clear canvas on render", () => {
      const ctx = canvas.getContext("2d")!;

      renderer.render();

      expect(ctx.fillRect).toHaveBeenCalled();
    });

    it("should render signals", () => {
      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      renderer.addSignal(signal);

      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
          ],
        },
      ];

      renderer.updateData(0, 100, data);
      renderer.render();

      const ctx = canvas.getContext("2d")!;
      expect(ctx.fillText).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("should not error when rendering without initialization", () => {
      const uninitializedRenderer = new WaveformRenderer();
      expect(() => uninitializedRenderer.render()).not.toThrow();
    });
  });

  describe("setViewTransform", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should update view transform", () => {
      renderer.setViewTransform({
        offsetX: 100,
        offsetY: 50,
        scaleX: 2.0,
        scaleY: 1.5,
      });

      const transform = renderer.getViewTransform();
      expect(transform.offsetX).toBe(100);
      expect(transform.offsetY).toBe(50);
      expect(transform.scaleX).toBe(2.0);
      expect(transform.scaleY).toBe(1.5);
    });

    it("should not modify original transform object", () => {
      const originalTransform = {
        offsetX: 100,
        offsetY: 50,
        scaleX: 2.0,
        scaleY: 1.5,
      };

      renderer.setViewTransform(originalTransform);
      originalTransform.offsetX = 200;

      const transform = renderer.getViewTransform();
      expect(transform.offsetX).toBe(100);
    });
  });

  describe("getValueAtTime", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);

      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      renderer.addSignal(signal);

      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
            { time: 20, value: 0 },
          ],
        },
      ];

      renderer.updateData(0, 100, data);
    });

    it("should return value at specific time", () => {
      const value = renderer.getValueAtTime("clk", 15);

      expect(value).not.toBeNull();
      expect(value!.value).toBe(1);
    });

    it("should return null for non-existent signal", () => {
      const value = renderer.getValueAtTime("nonexistent", 10);

      expect(value).toBeNull();
    });

    it("should return correct value at transition point", () => {
      const value = renderer.getValueAtTime("clk", 10);

      expect(value).not.toBeNull();
      expect(value!.value).toBe(1);
    });
  });

  describe("xToTime", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any, {
        timeScale: 10,
      });
    });

    it("should convert X coordinate to time", () => {
      const time = renderer.xToTime(100);

      expect(time).toBe(10); // 100 / 10
    });

    it("should account for view transform", () => {
      renderer.setViewTransform({
        offsetX: 50,
        offsetY: 0,
        scaleX: 2.0,
        scaleY: 1.0,
      });

      const time = renderer.xToTime(100);

      expect(time).toBe(2.5); // (100 - 50) / (10 * 2.0)
    });
  });

  describe("getConfig", () => {
    it("should return config copy", () => {
      renderer.initialize(canvas as any);

      const config1 = renderer.getConfig();
      const config2 = renderer.getConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it("should not allow external modification", () => {
      renderer.initialize(canvas as any);

      const config = renderer.getConfig();
      config.width = 9999;

      const newConfig = renderer.getConfig();
      expect(newConfig.width).not.toBe(9999);
    });
  });

  describe("getViewTransform", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should return transform copy", () => {
      const transform1 = renderer.getViewTransform();
      const transform2 = renderer.getViewTransform();

      expect(transform1).not.toBe(transform2);
      expect(transform1).toEqual(transform2);
    });
  });

  describe("getSignals", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should return array of signals", () => {
      const signal1: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      const signal2: Signal = {
        id: "data",
        name: "data",
        type: "data",
        color: "#00FF00",
        bitWidth: 32,
      };

      renderer.addSignal(signal1);
      renderer.addSignal(signal2);

      const signals = renderer.getSignals();

      expect(signals).toHaveLength(2);
      expect(signals.find((s) => s.id === "clk")).toBeDefined();
      expect(signals.find((s) => s.id === "data")).toBeDefined();
    });
  });

  describe("integration", () => {
    it("should handle complete workflow", () => {
      renderer.initialize(canvas as any, {
        width: 1000,
        height: 600,
        timeScale: 10,
      });

      // Add signals
      const clkSignal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#3B82F6",
        bitWidth: 1,
      };

      const dataSignal: Signal = {
        id: "data",
        name: "data_bus",
        type: "data",
        color: "#10B981",
        bitWidth: 32,
      };

      renderer.addSignal(clkSignal);
      renderer.addSignal(dataSignal);

      // Update data
      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
            { time: 20, value: 0 },
            { time: 30, value: 1 },
          ],
        },
        {
          signalId: "data",
          transitions: [
            { time: 0, value: 0 },
            { time: 15, value: 255 },
            { time: 25, value: 0 },
          ],
        },
      ];

      renderer.updateData(0, 100, data);

      // Set view transform
      renderer.setViewTransform({
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.5,
        scaleY: 1.0,
      });

      // Render
      expect(() => renderer.render()).not.toThrow();

      // Verify values
      const clkValue = renderer.getValueAtTime("clk", 15);
      const dataValue = renderer.getValueAtTime("data", 20);

      expect(clkValue!.value).toBe(1);
      expect(dataValue!.value).toBe(255);
    });
  });

  describe("getInfoAtPosition", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any, {
        width: 1000,
        height: 600,
        timeScale: 10,
        signalHeight: 60,
      });

      const signal1: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      const signal2: Signal = {
        id: "data",
        name: "data",
        type: "data",
        color: "#00FF00",
        bitWidth: 32,
      };

      renderer.addSignal(signal1);
      renderer.addSignal(signal2);

      const data: SignalData[] = [
        {
          signalId: "clk",
          transitions: [
            { time: 0, value: 0 },
            { time: 10, value: 1 },
          ],
        },
        {
          signalId: "data",
          transitions: [
            { time: 0, value: 0 },
            { time: 15, value: 255 },
          ],
        },
      ];

      renderer.updateData(0, 100, data);
    });

    it("should return time at position", () => {
      const info = renderer.getInfoAtPosition(100, 30);

      expect(info.time).toBe(10); // 100 / 10
    });

    it("should return signal at position", () => {
      const info = renderer.getInfoAtPosition(100, 30);

      expect(info.signal).not.toBeNull();
      expect(info.signal!.id).toBe("clk");
    });

    it("should return value at position", () => {
      const info = renderer.getInfoAtPosition(150, 30);

      expect(info.value).not.toBeNull();
      expect(info.value!.value).toBe(1);
    });

    it("should return second signal for Y in second track", () => {
      const info = renderer.getInfoAtPosition(100, 90);

      expect(info.signal).not.toBeNull();
      expect(info.signal!.id).toBe("data");
    });

    it("should return null signal for Y outside signal area", () => {
      const info = renderer.getInfoAtPosition(100, 1000);

      expect(info.signal).toBeNull();
      expect(info.value).toBeNull();
    });

    it("should return null signal for negative Y", () => {
      const info = renderer.getInfoAtPosition(100, -10);

      expect(info.signal).toBeNull();
    });
  });

  describe("drawCursor", () => {
    beforeEach(() => {
      renderer.initialize(canvas as any);
    });

    it("should draw cursor line", () => {
      const ctx = canvas.getContext("2d")!;

      renderer.drawCursor(100);

      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(100, 0);
      expect(ctx.stroke).toHaveBeenCalled();
    });

    it("should not error without initialization", () => {
      const uninitializedRenderer = new WaveformRenderer();
      expect(() => uninitializedRenderer.drawCursor(100)).not.toThrow();
    });
  });
});
