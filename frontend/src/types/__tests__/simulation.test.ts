/**
 * Tests for simulation data models
 * Verifies type definitions and basic data structure creation
 */

import {
  SignalValue,
  Transition,
  Signal,
  ComponentNode,
  ComponentEdge,
  SimulationState,
  TestbenchSpecification,
  ClockSpec,
  SignalSpec,
  UVMComponentSpec,
} from "../simulation";

describe("Simulation Data Models", () => {
  describe("SignalValue", () => {
    it("should create a valid binary signal value", () => {
      const signalValue: SignalValue = {
        type: "binary",
        value: "1010",
        isUnknown: false,
      };

      expect(signalValue.type).toBe("binary");
      expect(signalValue.value).toBe("1010");
      expect(signalValue.isUnknown).toBe(false);
    });

    it("should create a signal value with unknown state", () => {
      const signalValue: SignalValue = {
        type: "binary",
        value: "X",
        isUnknown: true,
      };

      expect(signalValue.isUnknown).toBe(true);
    });
  });

  describe("Transition", () => {
    it("should create a valid transition", () => {
      const transition: Transition = {
        time: 100,
        value: 1,
      };

      expect(transition.time).toBe(100);
      expect(transition.value).toBe(1);
    });
  });

  describe("Signal", () => {
    it("should create a clock signal", () => {
      const signal: Signal = {
        id: "clk",
        name: "clock",
        type: "clock",
        color: "#FF0000",
        bitWidth: 1,
      };

      expect(signal.type).toBe("clock");
      expect(signal.bitWidth).toBe(1);
    });

    it("should create a multi-bit data signal", () => {
      const signal: Signal = {
        id: "data_bus",
        name: "data",
        type: "data",
        color: "#00FF00",
        bitWidth: 32,
      };

      expect(signal.type).toBe("data");
      expect(signal.bitWidth).toBe(32);
    });
  });

  describe("ComponentNode", () => {
    it("should create a driver component", () => {
      const component: ComponentNode = {
        id: "driver_1",
        type: "driver",
        name: "ALU Driver",
        position: { x: 100, y: 200 },
        size: { width: 120, height: 80 },
        children: [],
        properties: { protocol: "AXI" },
      };

      expect(component.type).toBe("driver");
      expect(component.position.x).toBe(100);
      expect(component.properties.protocol).toBe("AXI");
    });

    it("should create a hierarchical component with children", () => {
      const monitor: ComponentNode = {
        id: "monitor_1",
        type: "monitor",
        name: "Monitor",
        position: { x: 0, y: 0 },
        size: { width: 100, height: 60 },
        children: [],
        properties: {},
      };

      const agent: ComponentNode = {
        id: "agent_1",
        type: "agent",
        name: "ALU Agent",
        position: { x: 50, y: 100 },
        size: { width: 200, height: 150 },
        children: [monitor],
        properties: {},
      };

      expect(agent.children.length).toBe(1);
      expect(agent.children[0].type).toBe("monitor");
    });
  });

  describe("ComponentEdge", () => {
    it("should create a TLM connection", () => {
      const edge: ComponentEdge = {
        id: "edge_1",
        from: "driver_1",
        to: "monitor_1",
        label: "TLM Port",
        type: "tlm",
      };

      expect(edge.type).toBe("tlm");
      expect(edge.from).toBe("driver_1");
      expect(edge.to).toBe("monitor_1");
    });
  });

  describe("SimulationState", () => {
    it("should create initial simulation state", () => {
      const state: SimulationState = {
        isRunning: false,
        currentTime: 0,
        cycleCount: 0,
        phase: "reset",
        events: [],
      };

      expect(state.isRunning).toBe(false);
      expect(state.phase).toBe("reset");
      expect(state.currentTime).toBe(0);
    });

    it("should create running simulation state with events", () => {
      const state: SimulationState = {
        isRunning: true,
        currentTime: 1000,
        cycleCount: 100,
        phase: "stimulus",
        events: [
          {
            time: 500,
            type: "transaction",
            description: "Write transaction",
            severity: "info",
          },
        ],
      };

      expect(state.isRunning).toBe(true);
      expect(state.phase).toBe("stimulus");
      expect(state.events.length).toBe(1);
      expect(state.events[0].type).toBe("transaction");
    });
  });

  describe("TestbenchSpecification", () => {
    it("should create a complete testbench specification", () => {
      const clocks: ClockSpec[] = [
        {
          name: "clk",
          period: 10,
          dutyCycle: 0.5,
          phase: 0,
        },
      ];

      const signals: SignalSpec[] = [
        {
          name: "data_in",
          type: "data",
          bitWidth: 32,
        },
        {
          name: "valid",
          type: "control",
          bitWidth: 1,
        },
      ];

      const components: UVMComponentSpec[] = [
        {
          id: "agent_1",
          type: "agent",
          name: "ALU Agent",
          children: [
            {
              id: "driver_1",
              type: "driver",
              name: "ALU Driver",
            },
            {
              id: "monitor_1",
              type: "monitor",
              name: "ALU Monitor",
            },
          ],
        },
      ];

      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "alu",
          ports: [
            { name: "clk", direction: "input", width: 1 },
            { name: "data_in", direction: "input", width: 32 },
            { name: "data_out", direction: "output", width: 32 },
          ],
        },
        verification: {
          testCases: [
            { name: "basic_test", description: "Basic ALU operations" },
          ],
          coverageGoals: [{ name: "functional", target: 100 }],
        },
        components,
        signals,
        clocks,
      };

      expect(spec.clocks.length).toBe(1);
      expect(spec.signals.length).toBe(2);
      expect(spec.components.length).toBe(1);
      expect(spec.components[0].children?.length).toBe(2);
      expect(spec.rtl.moduleName).toBe("alu");
    });
  });
});
