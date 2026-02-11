/**
 * SimulationContext Tests
 * Unit tests for the SimulationContext and hooks
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  SimulationProvider,
  useSimulation,
  useSimulationState,
  useSimulationControls,
} from "../SimulationContext";
import { SimulationEngine } from "../../services/SimulationEngine";
import React from "react";

describe("SimulationContext", () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine();
    jest.clearAllMocks();
  });

  afterEach(() => {
    engine.destroy();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <SimulationProvider engine={engine} projectId="test-project">{children}</SimulationProvider>
  );

  describe("useSimulation hook", () => {
    it("should provide simulation state and controls", () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.engine).toBe(engine);
      expect(result.current.state).toBeDefined();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.cycleCount).toBe(0);
      expect(result.current.phase).toBe("reset");
      expect(result.current.events).toEqual([]);
      expect(typeof result.current.start).toBe("function");
      expect(typeof result.current.pause).toBe("function");
      expect(typeof result.current.resume).toBe("function");
      expect(typeof result.current.reset).toBe("function");
      expect(typeof result.current.setSpeed).toBe("function");
    });

    it("should throw error when used outside provider", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      expect(() => {
        renderHook(() => useSimulation());
      }).toThrow("useSimulation must be used within a SimulationProvider");

      consoleSpy.mockRestore();
    });

    it("should update state when engine state changes", async () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.isRunning).toBe(false);

      act(() => {
        engine.start();
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });
    });

    it("should call engine.start when start is called", () => {
      const startSpy = jest.spyOn(engine, "start");
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.start();
      });

      expect(startSpy).toHaveBeenCalled();
    });

    it("should call engine.pause when pause is called", () => {
      const pauseSpy = jest.spyOn(engine, "pause");
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.pause();
      });

      expect(pauseSpy).toHaveBeenCalled();
    });

    it("should call engine.resume when resume is called", () => {
      const resumeSpy = jest.spyOn(engine, "resume");
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.resume();
      });

      expect(resumeSpy).toHaveBeenCalled();
    });

    it("should call engine.reset when reset is called", () => {
      const resetSpy = jest.spyOn(engine, "reset");
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.reset();
      });

      expect(resetSpy).toHaveBeenCalled();
    });

    it("should call engine.setSpeed when setSpeed is called", () => {
      const setSpeedSpy = jest.spyOn(engine, "setSpeed");
      const { result } = renderHook(() => useSimulation(), { wrapper });

      act(() => {
        result.current.setSpeed(2.0);
      });

      expect(setSpeedSpy).toHaveBeenCalledWith(2.0);
    });
  });

  describe("useSimulationState hook", () => {
    it("should provide only simulation state", () => {
      const { result } = renderHook(() => useSimulationState(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.cycleCount).toBe(0);
      expect(result.current.phase).toBe("reset");
      expect(result.current.events).toEqual([]);
    });

    it("should update when engine state changes", async () => {
      const { result } = renderHook(() => useSimulationState(), { wrapper });

      expect(result.current.isRunning).toBe(false);

      act(() => {
        engine.start();
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(true);
      });
    });
  });

  describe("useSimulationControls hook", () => {
    it("should provide only control methods", () => {
      const { result } = renderHook(() => useSimulationControls(), { wrapper });

      expect(typeof result.current.start).toBe("function");
      expect(typeof result.current.pause).toBe("function");
      expect(typeof result.current.resume).toBe("function");
      expect(typeof result.current.reset).toBe("function");
      expect(typeof result.current.setSpeed).toBe("function");
    });

    it("should call engine methods", () => {
      const startSpy = jest.spyOn(engine, "start");
      const pauseSpy = jest.spyOn(engine, "pause");
      const resetSpy = jest.spyOn(engine, "reset");
      const setSpeedSpy = jest.spyOn(engine, "setSpeed");

      const { result } = renderHook(() => useSimulationControls(), { wrapper });

      act(() => {
        result.current.start();
        result.current.pause();
        result.current.reset();
        result.current.setSpeed(1.5);
      });

      expect(startSpy).toHaveBeenCalled();
      expect(pauseSpy).toHaveBeenCalled();
      expect(resetSpy).toHaveBeenCalled();
      expect(setSpeedSpy).toHaveBeenCalledWith(1.5);
    });
  });

  describe("State synchronization", () => {
    it("should synchronize phase changes", async () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.phase).toBe("reset");

      act(() => {
        engine.setPhase("stimulus");
      });

      await waitFor(() => {
        expect(result.current.phase).toBe("stimulus");
      });
    });

    it("should synchronize event additions", async () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.events).toHaveLength(0);

      act(() => {
        engine.addEvent({
          time: 10,
          type: "transaction",
          description: "Test event",
          severity: "info",
        });
      });

      await waitFor(() => {
        expect(result.current.events).toHaveLength(1);
        expect(result.current.events[0].description).toBe("Test event");
      });
    });

    it("should synchronize time and cycle updates", async () => {
      const { result } = renderHook(() => useSimulation(), { wrapper });

      expect(result.current.currentTime).toBe(0);
      expect(result.current.cycleCount).toBe(0);

      act(() => {
        engine.start();
      });

      await waitFor(
        () => {
          expect(result.current.currentTime).toBeGreaterThan(0);
        },
        { timeout: 100 },
      );
    });
  });

  describe("Provider cleanup", () => {
    it("should unsubscribe from engine on unmount", () => {
      const { unmount } = renderHook(() => useSimulation(), { wrapper });

      // Get the number of callbacks before unmount
      const callbacksBefore = (engine as any).callbacks.size;

      unmount();

      // Callbacks should be cleaned up
      const callbacksAfter = (engine as any).callbacks.size;
      expect(callbacksAfter).toBeLessThan(callbacksBefore);
    });
  });
});
