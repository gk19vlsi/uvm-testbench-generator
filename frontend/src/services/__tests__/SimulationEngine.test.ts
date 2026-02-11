/**
 * Unit tests for SimulationEngine
 */

import { SimulationEngine } from "../SimulationEngine";
import { SimulationState } from "../../types/simulation";

// Mock requestAnimationFrame and cancelAnimationFrame
let animationFrameCallbacks: FrameRequestCallback[] = [];
let animationFrameId = 0;

// @ts-ignore
globalThis.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  animationFrameCallbacks.push(callback);
  return ++animationFrameId;
});

// @ts-ignore
globalThis.cancelAnimationFrame = jest.fn((_id: number) => {
  animationFrameCallbacks = [];
});

// Mock performance.now()
let mockTime = 0;
// @ts-ignore
globalThis.performance.now = jest.fn(() => mockTime);

describe("SimulationEngine", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
    animationFrameCallbacks = [];
    animationFrameId = 0;
    mockTime = 0;
    jest.clearAllMocks();
  });

  afterEach(() => {
    engine.destroy();
  });

  describe("initial state", () => {
    it("should start with default state", () => {
      const state = engine.getState();

      expect(state.isRunning).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.cycleCount).toBe(0);
      expect(state.phase).toBe("reset");
      expect(state.events).toHaveLength(0);
    });
  });

  describe("start", () => {
    it("should start the simulation", () => {
      engine.start();
      const state = engine.getState();

      expect(state.isRunning).toBe(true);
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it("should not start if already running", () => {
      engine.start();
      const callCount = (requestAnimationFrame as jest.Mock).mock.calls.length;

      engine.start();
      expect((requestAnimationFrame as jest.Mock).mock.calls.length).toBe(
        callCount,
      );
    });

    it("should notify callbacks when started", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0][0] as SimulationState;
      expect(state.isRunning).toBe(true);
    });
  });

  describe("pause", () => {
    it("should pause the simulation", () => {
      engine.start();
      engine.pause();
      const state = engine.getState();

      expect(state.isRunning).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it("should not pause if already paused", () => {
      engine.pause();
      const callCount = (cancelAnimationFrame as jest.Mock).mock.calls.length;

      engine.pause();
      expect((cancelAnimationFrame as jest.Mock).mock.calls.length).toBe(
        callCount,
      );
    });

    it("should notify callbacks when paused", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();
      callback.mockClear();

      engine.pause();

      expect(callback).toHaveBeenCalled();
      const state = callback.mock.calls[0][0] as SimulationState;
      expect(state.isRunning).toBe(false);
    });
  });

  describe("resume", () => {
    it("should resume the simulation", () => {
      engine.start();
      engine.pause();
      engine.resume();
      const state = engine.getState();

      expect(state.isRunning).toBe(true);
    });

    it("should not resume if already running", () => {
      engine.start();
      const callCount = (requestAnimationFrame as jest.Mock).mock.calls.length;

      engine.resume();
      expect((requestAnimationFrame as jest.Mock).mock.calls.length).toBe(
        callCount,
      );
    });
  });

  describe("reset", () => {
    it("should reset simulation to initial state", () => {
      engine.start();
      mockTime = 100;
      animationFrameCallbacks[0](mockTime);

      engine.reset();
      const state = engine.getState();

      expect(state.isRunning).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.cycleCount).toBe(0);
      expect(state.phase).toBe("reset");
    });

    it("should stop if was running before reset", () => {
      engine.start();
      engine.reset();
      const state = engine.getState();

      expect(state.isRunning).toBe(false);
    });

    it("should notify callbacks when reset", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();
      callback.mockClear();

      engine.reset();

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("setSpeed", () => {
    it("should set speed multiplier", () => {
      engine.setSpeed(2.0);
      // Speed is internal, verify through time advancement
      engine.start();

      mockTime = 0;
      animationFrameCallbacks[0](mockTime);

      mockTime = 100;
      animationFrameCallbacks[0](mockTime);

      const state = engine.getState();
      expect(state.currentTime).toBe(200); // 100ms * 2.0 speed
    });

    it("should throw error for non-positive speed", () => {
      expect(() => engine.setSpeed(0)).toThrow(
        "Speed multiplier must be positive",
      );
      expect(() => engine.setSpeed(-1)).toThrow(
        "Speed multiplier must be positive",
      );
    });
  });

  describe("getState", () => {
    it("should return a copy of the state", () => {
      const state1 = engine.getState();
      const state2 = engine.getState();

      expect(state1).not.toBe(state2);
      expect(state1).toEqual(state2);
    });

    it("should not allow external modification", () => {
      const state = engine.getState();
      state.currentTime = 999;

      const newState = engine.getState();
      expect(newState.currentTime).toBe(0);
    });
  });

  describe("onStateUpdate", () => {
    it("should register callback", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();

      expect(callback).toHaveBeenCalled();
    });

    it("should return unsubscribe function", () => {
      const callback = jest.fn();
      const unsubscribe = engine.onStateUpdate(callback);

      engine.start();
      // Called twice: once on start(), once on animate()
      expect(callback).toHaveBeenCalledTimes(2);

      callback.mockClear();
      unsubscribe();

      engine.pause();
      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle multiple callbacks", () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      engine.onStateUpdate(callback1);
      engine.onStateUpdate(callback2);

      engine.start();

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it("should handle callback errors gracefully", () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = jest.fn();

      engine.onStateUpdate(errorCallback);
      engine.onStateUpdate(normalCallback);

      // Should not throw
      expect(() => engine.start()).not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });

  describe("addEvent", () => {
    it("should add event to state", () => {
      engine.addEvent({
        time: 100,
        type: "transaction",
        description: "Test transaction",
        severity: "info",
      });

      const state = engine.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].description).toBe("Test transaction");
    });

    it("should notify callbacks when event added", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.addEvent({
        time: 100,
        type: "error",
        description: "Test error",
        severity: "error",
      });

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("clearEvents", () => {
    it("should clear all events", () => {
      engine.addEvent({
        time: 100,
        type: "transaction",
        description: "Event 1",
        severity: "info",
      });
      engine.addEvent({
        time: 200,
        type: "transaction",
        description: "Event 2",
        severity: "info",
      });

      engine.clearEvents();

      const state = engine.getState();
      expect(state.events).toHaveLength(0);
    });
  });

  describe("setPhase", () => {
    it("should change phase", () => {
      engine.setPhase("stimulus");

      const state = engine.getState();
      expect(state.phase).toBe("stimulus");
    });

    it("should add phase change event", () => {
      engine.setPhase("checking");

      const state = engine.getState();
      expect(state.events).toHaveLength(1);
      expect(state.events[0].type).toBe("phase_change");
    });

    it("should not add event if phase unchanged", () => {
      engine.setPhase("reset");

      const state = engine.getState();
      expect(state.events).toHaveLength(0);
    });
  });

  describe("animation loop", () => {
    it("should advance time on each frame", () => {
      engine.start();

      mockTime = 0;
      animationFrameCallbacks[0](mockTime);

      mockTime = 50;
      animationFrameCallbacks[0](mockTime);

      const state = engine.getState();
      expect(state.currentTime).toBe(50);
    });

    it("should update cycle count", () => {
      engine.start();

      mockTime = 0;
      animationFrameCallbacks[0](mockTime);

      mockTime = 100;
      animationFrameCallbacks[0](mockTime);

      const state = engine.getState();
      expect(state.cycleCount).toBe(10); // 100 / 10
    });

    it("should update phase based on time", () => {
      engine.start();

      // Reset phase (0-100)
      mockTime = 0;
      animationFrameCallbacks[0](mockTime);
      expect(engine.getState().phase).toBe("reset");

      // Stimulus phase (100-500)
      mockTime = 150;
      animationFrameCallbacks[0](mockTime);
      expect(engine.getState().phase).toBe("stimulus");

      // Checking phase (500-1000)
      mockTime = 600;
      animationFrameCallbacks[0](mockTime);
      expect(engine.getState().phase).toBe("checking");

      // Complete phase (>1000)
      mockTime = 1100;
      animationFrameCallbacks[0](mockTime);
      expect(engine.getState().phase).toBe("complete");
    });

    it("should auto-pause when complete", () => {
      engine.start();

      mockTime = 0;
      animationFrameCallbacks[0](mockTime);

      mockTime = 1100;
      animationFrameCallbacks[0](mockTime);

      const state = engine.getState();
      expect(state.phase).toBe("complete");
      expect(state.isRunning).toBe(false);
    });

    it("should notify callbacks on each frame", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();
      callback.mockClear();

      mockTime = 50;
      animationFrameCallbacks[0](mockTime);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("should cleanup resources", () => {
      const callback = jest.fn();
      engine.onStateUpdate(callback);

      engine.start();

      engine.destroy();

      expect(cancelAnimationFrame).toHaveBeenCalled();

      // Callbacks should be cleared
      callback.mockClear();
      engine.start();
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
