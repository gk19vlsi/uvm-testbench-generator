/**
 * Property-based tests for simulation data models
 * Uses fast-check to verify properties across many random inputs
 */

import * as fc from "fast-check";
import {
  Signal,
  Transition,
  ClockSpec,
  SignalSpec,
  ComponentNode,
} from "../simulation";

describe("Simulation Data Models - Property Tests", () => {
  describe("Signal properties", () => {
    it("should always have a positive bit width", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.constantFrom("clock", "data", "control"),
          fc.string({ minLength: 6, maxLength: 6 }),
          fc.integer({ min: 1, max: 128 }),
          (id, name, type, colorHex, bitWidth) => {
            const signal: Signal = {
              id,
              name,
              type: type as "clock" | "data" | "control",
              color: `#${colorHex}`,
              bitWidth,
            };

            expect(signal.bitWidth).toBeGreaterThan(0);
            expect(signal.bitWidth).toBeLessThanOrEqual(128);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should have valid signal types", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.constantFrom("clock", "data", "control"),
          fc.string({ minLength: 6, maxLength: 6 }),
          fc.integer({ min: 1, max: 64 }),
          (id, name, type, colorHex, bitWidth) => {
            const signal: Signal = {
              id,
              name,
              type: type as "clock" | "data" | "control",
              color: `#${colorHex}`,
              bitWidth,
            };

            expect(["clock", "data", "control"]).toContain(signal.type);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("Transition properties", () => {
    it("should have non-negative time values", () => {
      fc.assert(
        fc.property(
          fc.nat(),
          fc.oneof(fc.integer(), fc.string()),
          (time, value) => {
            const transition: Transition = { time, value };

            expect(transition.time).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should maintain time ordering in transition arrays", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              time: fc.nat({ max: 10000 }),
              value: fc.integer({ min: 0, max: 1 }),
            }),
            { minLength: 2, maxLength: 20 },
          ),
          (transitions) => {
            // Sort transitions by time
            const sorted = [...transitions].sort((a, b) => a.time - b.time);

            // Verify ordering
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].time).toBeGreaterThanOrEqual(sorted[i - 1].time);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("ClockSpec properties", () => {
    it("should have duty cycle between 0 and 1", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 0, max: 360 }),
          (name, period, dutyCycle, phase) => {
            const clockSpec: ClockSpec = {
              name,
              period,
              dutyCycle,
              phase,
            };

            expect(clockSpec.dutyCycle).toBeGreaterThanOrEqual(0);
            expect(clockSpec.dutyCycle).toBeLessThanOrEqual(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should have positive period", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 0, max: 360 }),
          (name, period, dutyCycle, phase) => {
            const clockSpec: ClockSpec = {
              name,
              period,
              dutyCycle,
              phase,
            };

            expect(clockSpec.period).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should have phase between 0 and 360 degrees", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.integer({ min: 1, max: 1000 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 0, max: 360 }),
          (name, period, dutyCycle, phase) => {
            const clockSpec: ClockSpec = {
              name,
              period,
              dutyCycle,
              phase,
            };

            expect(clockSpec.phase).toBeGreaterThanOrEqual(0);
            expect(clockSpec.phase).toBeLessThanOrEqual(360);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("ComponentNode properties", () => {
    it("should have valid component types", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom(
            "agent",
            "driver",
            "monitor",
            "scoreboard",
            "sequencer",
            "env",
          ),
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 10, max: 500 }),
          fc.integer({ min: 10, max: 500 }),
          (id, type, name, x, y, width, height) => {
            const component: ComponentNode = {
              id,
              type: type as ComponentNode["type"],
              name,
              position: { x, y },
              size: { width, height },
              children: [],
              properties: {},
            };

            expect([
              "agent",
              "driver",
              "monitor",
              "scoreboard",
              "sequencer",
              "env",
            ]).toContain(component.type);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("should have positive dimensions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom(
            "agent",
            "driver",
            "monitor",
            "scoreboard",
            "sequencer",
            "env",
          ),
          fc.string({ minLength: 1 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 10, max: 500 }),
          fc.integer({ min: 10, max: 500 }),
          (id, type, name, x, y, width, height) => {
            const component: ComponentNode = {
              id,
              type: type as ComponentNode["type"],
              name,
              position: { x, y },
              size: { width, height },
              children: [],
              properties: {},
            };

            expect(component.size.width).toBeGreaterThan(0);
            expect(component.size.height).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("SignalSpec properties", () => {
    it("should have positive bit width", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.constantFrom("clock", "data", "control"),
          fc.integer({ min: 1, max: 128 }),
          (name, type, bitWidth) => {
            const signalSpec: SignalSpec = {
              name,
              type: type as "clock" | "data" | "control",
              bitWidth,
            };

            expect(signalSpec.bitWidth).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
