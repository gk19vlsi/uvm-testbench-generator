/**
 * Unit tests for SignalTimeSeries
 */

import { SignalTimeSeries } from "../SignalTimeSeries";
import { Transition } from "../../types/simulation";

describe("SignalTimeSeries", () => {
  describe("constructor", () => {
    it("should create empty time series", () => {
      const series = new SignalTimeSeries("clk");

      expect(series.getSignalId()).toBe("clk");
      expect(series.getTransitionCount()).toBe(0);
    });

    it("should create time series with initial transitions", () => {
      const transitions: Transition[] = [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
        { time: 20, value: 0 },
      ];

      const series = new SignalTimeSeries("clk", transitions);

      expect(series.getTransitionCount()).toBe(3);
    });

    it("should sort transitions by time", () => {
      const transitions: Transition[] = [
        { time: 20, value: 0 },
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ];

      const series = new SignalTimeSeries("clk", transitions);
      const sorted = series.getTransitions();

      expect(sorted[0].time).toBe(0);
      expect(sorted[1].time).toBe(10);
      expect(sorted[2].time).toBe(20);
    });
  });

  describe("getValueAt", () => {
    it("should return unknown for empty series", () => {
      const series = new SignalTimeSeries("clk");
      const value = series.getValueAt(10);

      expect(value.isUnknown).toBe(true);
      expect(value.value).toBe("X");
    });

    it("should return unknown for time before first transition", () => {
      const series = new SignalTimeSeries("clk", [{ time: 10, value: 1 }]);
      const value = series.getValueAt(5);

      expect(value.isUnknown).toBe(true);
    });

    it("should return value at exact transition time", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ]);

      const value = series.getValueAt(10);

      expect(value.isUnknown).toBe(false);
      expect(value.value).toBe(1);
    });

    it("should return most recent value between transitions", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
        { time: 20, value: 0 },
      ]);

      const value = series.getValueAt(15);

      expect(value.value).toBe(1);
    });

    it("should return last value for time after all transitions", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ]);

      const value = series.getValueAt(100);

      expect(value.value).toBe(1);
    });

    it("should handle decimal values", () => {
      const series = new SignalTimeSeries("data", [{ time: 0, value: 42 }]);

      const value = series.getValueAt(5);

      expect(value.type).toBe("decimal");
      expect(value.value).toBe(42);
    });

    it("should handle hex values", () => {
      const series = new SignalTimeSeries("data", [
        { time: 0, value: "0xABCD" },
      ]);

      const value = series.getValueAt(5);

      expect(value.type).toBe("hex");
      expect(value.value).toBe("0xABCD");
    });

    it("should handle unknown values (X)", () => {
      const series = new SignalTimeSeries("data", [{ time: 0, value: "X" }]);

      const value = series.getValueAt(5);

      expect(value.isUnknown).toBe(true);
      expect(value.value).toBe("X");
    });

    it("should handle high-Z values (Z)", () => {
      const series = new SignalTimeSeries("data", [{ time: 0, value: "Z" }]);

      const value = series.getValueAt(5);

      expect(value.isUnknown).toBe(true);
      expect(value.value).toBe("Z");
    });
  });

  describe("getTransitionsInRange", () => {
    it("should return empty array for empty series", () => {
      const series = new SignalTimeSeries("clk");
      const transitions = series.getTransitionsInRange(0, 100);

      expect(transitions).toHaveLength(0);
    });

    it("should return transitions within range", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
        { time: 20, value: 0 },
        { time: 30, value: 1 },
      ]);

      const transitions = series.getTransitionsInRange(10, 25);

      expect(transitions).toHaveLength(2);
      expect(transitions[0].time).toBe(10);
      expect(transitions[1].time).toBe(20);
    });

    it("should include transitions at range boundaries", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
        { time: 20, value: 0 },
      ]);

      const transitions = series.getTransitionsInRange(10, 20);

      expect(transitions).toHaveLength(2);
      expect(transitions[0].time).toBe(10);
      expect(transitions[1].time).toBe(20);
    });

    it("should return empty array for range before all transitions", () => {
      const series = new SignalTimeSeries("clk", [{ time: 10, value: 1 }]);

      const transitions = series.getTransitionsInRange(0, 5);

      expect(transitions).toHaveLength(0);
    });

    it("should return empty array for range after all transitions", () => {
      const series = new SignalTimeSeries("clk", [{ time: 10, value: 1 }]);

      const transitions = series.getTransitionsInRange(20, 30);

      expect(transitions).toHaveLength(0);
    });

    it("should return all transitions if range covers all", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 10, value: 0 },
        { time: 20, value: 1 },
        { time: 30, value: 0 },
      ]);

      const transitions = series.getTransitionsInRange(0, 100);

      expect(transitions).toHaveLength(3);
    });
  });

  describe("addTransition", () => {
    it("should add transition to empty series", () => {
      const series = new SignalTimeSeries("clk");

      series.addTransition({ time: 10, value: 1 });

      expect(series.getTransitionCount()).toBe(1);
    });

    it("should maintain sorted order when adding", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 20, value: 0 },
      ]);

      series.addTransition({ time: 10, value: 1 });

      const transitions = series.getTransitions();
      expect(transitions[0].time).toBe(0);
      expect(transitions[1].time).toBe(10);
      expect(transitions[2].time).toBe(20);
    });

    it("should add transition at the beginning", () => {
      const series = new SignalTimeSeries("clk", [{ time: 10, value: 1 }]);

      series.addTransition({ time: 0, value: 0 });

      const transitions = series.getTransitions();
      expect(transitions[0].time).toBe(0);
    });

    it("should add transition at the end", () => {
      const series = new SignalTimeSeries("clk", [{ time: 0, value: 0 }]);

      series.addTransition({ time: 10, value: 1 });

      const transitions = series.getTransitions();
      expect(transitions[1].time).toBe(10);
    });
  });

  describe("addTransitions", () => {
    it("should add multiple transitions", () => {
      const series = new SignalTimeSeries("clk");

      series.addTransitions([
        { time: 0, value: 0 },
        { time: 10, value: 1 },
        { time: 20, value: 0 },
      ]);

      expect(series.getTransitionCount()).toBe(3);
    });

    it("should sort all transitions after adding", () => {
      const series = new SignalTimeSeries("clk", [{ time: 15, value: 1 }]);

      series.addTransitions([
        { time: 20, value: 0 },
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ]);

      const transitions = series.getTransitions();
      expect(transitions[0].time).toBe(0);
      expect(transitions[1].time).toBe(10);
      expect(transitions[2].time).toBe(15);
      expect(transitions[3].time).toBe(20);
    });
  });

  describe("clear", () => {
    it("should remove all transitions", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 0, value: 0 },
        { time: 10, value: 1 },
      ]);

      series.clear();

      expect(series.getTransitionCount()).toBe(0);
    });
  });

  describe("getTimeRange", () => {
    it("should return null for empty series", () => {
      const series = new SignalTimeSeries("clk");

      const range = series.getTimeRange();

      expect(range).toBeNull();
    });

    it("should return time range for non-empty series", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 10, value: 0 },
        { time: 50, value: 1 },
        { time: 30, value: 0 },
      ]);

      const range = series.getTimeRange();

      expect(range).not.toBeNull();
      expect(range!.start).toBe(10);
      expect(range!.end).toBe(50);
    });

    it("should return same start and end for single transition", () => {
      const series = new SignalTimeSeries("clk", [{ time: 10, value: 1 }]);

      const range = series.getTimeRange();

      expect(range!.start).toBe(10);
      expect(range!.end).toBe(10);
    });
  });

  describe("edge cases", () => {
    it("should handle large number of transitions efficiently", () => {
      const transitions: Transition[] = [];
      for (let i = 0; i < 10000; i++) {
        transitions.push({ time: i, value: i % 2 });
      }

      const series = new SignalTimeSeries("clk", transitions);

      // Should be fast (O(log n))
      const start = performance.now();
      const value = series.getValueAt(5000);
      const end = performance.now();

      expect(value.value).toBe(0);
      expect(end - start).toBeLessThan(10); // Should be very fast
    });

    it("should handle transitions with same time", () => {
      const series = new SignalTimeSeries("clk", [
        { time: 10, value: 0 },
        { time: 10, value: 1 },
      ]);

      expect(series.getTransitionCount()).toBe(2);
    });

    it("should not modify original transitions array", () => {
      const transitions: Transition[] = [
        { time: 20, value: 0 },
        { time: 0, value: 0 },
      ];

      new SignalTimeSeries("clk", transitions);

      // Original array should not be sorted
      expect(transitions[0].time).toBe(20);
      expect(transitions[1].time).toBe(0);
    });

    it("should return copies of transitions", () => {
      const series = new SignalTimeSeries("clk", [{ time: 0, value: 0 }]);

      const transitions1 = series.getTransitions();
      const transitions2 = series.getTransitions();

      expect(transitions1).not.toBe(transitions2);
      expect(transitions1).toEqual(transitions2);
    });
  });
});
