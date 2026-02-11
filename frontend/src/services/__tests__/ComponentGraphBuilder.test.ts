/**
 * Unit tests for ComponentGraphBuilder
 */

import { ComponentGraphBuilder } from "../ComponentGraphBuilder";
import {
  TestbenchSpecification,
  SpecificationChanges,
} from "../../types/simulation";

describe("ComponentGraphBuilder", () => {
  let builder: ComponentGraphBuilder;

  beforeEach(() => {
    builder = new ComponentGraphBuilder();
  });

  describe("buildGraph", () => {
    it("should build graph from specification", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Test Agent",
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].id).toBe("agent_1");
      expect(graph.edges).toBeDefined();
      expect(graph.layout).toBeDefined();
    });

    it("should build hierarchical graph", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "Monitor",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      expect(graph.nodes).toHaveLength(1);
      expect(graph.nodes[0].children).toHaveLength(2);
    });

    it("should create edges between components", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it("should set component positions", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent 1",
          },
          {
            id: "agent_2",
            type: "agent",
            name: "Agent 2",
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      expect(graph.nodes[0].position).toBeDefined();
      expect(graph.nodes[1].position).toBeDefined();
      expect(graph.nodes[0].position.x).not.toBe(graph.nodes[1].position.x);
    });

    it("should set component sizes based on type", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "env_1",
            type: "env",
            name: "Environment",
          },
          {
            id: "driver_1",
            type: "driver",
            name: "Driver",
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      const envNode = graph.nodes.find((n) => n.type === "env");
      const driverNode = graph.nodes.find((n) => n.type === "driver");

      expect(envNode!.size.width).toBeGreaterThan(driverNode!.size.width);
    });
  });

  describe("updateGraph", () => {
    beforeEach(() => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent 1",
          },
          {
            id: "agent_2",
            type: "agent",
            name: "Agent 2",
          },
        ],
        signals: [],
        clocks: [],
      };

      builder.buildGraph(spec);
    });

    it("should add new components", () => {
      const changes: SpecificationChanges = {
        addedComponents: [
          {
            id: "agent_3",
            type: "agent",
            name: "Agent 3",
          },
        ],
        removedComponents: [],
        addedSignals: [],
        removedSignals: [],
        addedClocks: [],
        removedClocks: [],
      };

      builder.updateGraph(changes);
      const graph = builder.getGraph();

      expect(graph!.nodes).toHaveLength(3);
    });

    it("should remove components", () => {
      const changes: SpecificationChanges = {
        addedComponents: [],
        removedComponents: ["agent_2"],
        addedSignals: [],
        removedSignals: [],
        addedClocks: [],
        removedClocks: [],
      };

      builder.updateGraph(changes);
      const graph = builder.getGraph();

      expect(graph!.nodes).toHaveLength(1);
      expect(graph!.nodes[0].id).toBe("agent_1");
    });

    it("should remove edges when component is removed", () => {
      const changes: SpecificationChanges = {
        addedComponents: [],
        removedComponents: ["agent_1"],
        addedSignals: [],
        removedSignals: [],
        addedClocks: [],
        removedClocks: [],
      };

      builder.updateGraph(changes);
      const graph = builder.getGraph();

      // Edges connected to agent_1 should be removed
      const hasAgent1Edges = graph!.edges.some(
        (edge) => edge.from === "agent_1" || edge.to === "agent_1",
      );
      expect(hasAgent1Edges).toBe(false);
    });

    it("should throw error if graph not initialized", () => {
      const uninitializedBuilder = new ComponentGraphBuilder();
      const changes: SpecificationChanges = {
        addedComponents: [],
        removedComponents: [],
        addedSignals: [],
        removedSignals: [],
        addedClocks: [],
        removedClocks: [],
      };

      expect(() => uninitializedBuilder.updateGraph(changes)).toThrow(
        "Graph not initialized",
      );
    });
  });

  describe("getComponentAt", () => {
    beforeEach(() => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [],
      };

      builder.buildGraph(spec);
    });

    it("should return component at position", () => {
      const graph = builder.getGraph();
      const node = graph!.nodes[0];

      const component = builder.getComponentAt(
        node.position.x + 10,
        node.position.y + 10,
      );

      expect(component).not.toBeNull();
      expect(component!.id).toBe("agent_1");
    });

    it("should return null for position outside components", () => {
      const component = builder.getComponentAt(10000, 10000);

      expect(component).toBeNull();
    });

    it("should return null if graph not initialized", () => {
      const uninitializedBuilder = new ComponentGraphBuilder();
      const component = uninitializedBuilder.getComponentAt(100, 100);

      expect(component).toBeNull();
    });

    it("should find child components", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      builder.buildGraph(spec);
      const graph = builder.getGraph();
      const childNode = graph!.nodes[0].children[0];

      const component = builder.getComponentAt(
        childNode.position.x + 10,
        childNode.position.y + 10,
      );

      expect(component).not.toBeNull();
      expect(component!.id).toBe("driver_1");
    });
  });

  describe("highlightComponent", () => {
    it("should highlight component", () => {
      builder.highlightComponent("agent_1");

      expect(builder.getHighlightedComponentId()).toBe("agent_1");
    });

    it("should clear highlight", () => {
      builder.highlightComponent("agent_1");
      builder.clearHighlight();

      expect(builder.getHighlightedComponentId()).toBeNull();
    });
  });

  describe("animateTransaction", () => {
    beforeEach(() => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "driver_1",
            type: "driver",
            name: "Driver",
          },
          {
            id: "monitor_1",
            type: "monitor",
            name: "Monitor",
          },
        ],
        signals: [],
        clocks: [],
      };

      builder.buildGraph(spec);
    });

    it("should create transaction animation", () => {
      builder.animateTransaction("driver_1", "monitor_1", {
        id: "txn_1",
        type: "write",
        data: { value: 42 },
        timestamp: 100,
      });

      const animations = builder.getActiveTransactions();
      expect(animations).toHaveLength(1);
      expect(animations[0].id).toBe("txn_1");
    });

    it("should not create animation for non-existent components", () => {
      builder.animateTransaction("nonexistent_1", "nonexistent_2", {
        id: "txn_1",
        type: "write",
        data: {},
        timestamp: 100,
      });

      const animations = builder.getActiveTransactions();
      expect(animations).toHaveLength(0);
    });

    it("should update animation progress", () => {
      builder.animateTransaction("driver_1", "monitor_1", {
        id: "txn_1",
        type: "write",
        data: {},
        timestamp: 100,
      });

      builder.updateAnimations();

      const animations = builder.getActiveTransactions();
      expect(animations[0].progress).toBeGreaterThanOrEqual(0);
    });

    it("should remove completed animations", () => {
      builder.animateTransaction("driver_1", "monitor_1", {
        id: "txn_1",
        type: "write",
        data: {},
        timestamp: 100,
      });

      // Manually set animation to completed
      const animations = builder.getActiveTransactions();
      animations[0].progress = 1.0;
      animations[0].startTime = performance.now() - 2000;

      builder.updateAnimations();

      const remainingAnimations = builder.getActiveTransactions();
      expect(remainingAnimations).toHaveLength(0);
    });
  });

  describe("getGraph", () => {
    it("should return null if not initialized", () => {
      const graph = builder.getGraph();

      expect(graph).toBeNull();
    });

    it("should return graph after initialization", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
          },
        ],
        signals: [],
        clocks: [],
      };

      builder.buildGraph(spec);
      const graph = builder.getGraph();

      expect(graph).not.toBeNull();
      expect(graph!.nodes).toHaveLength(1);
    });
  });

  describe("edge creation", () => {
    it("should create TLM edges between driver and monitor in agent", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: "Monitor",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      const tlmEdge = graph.edges.find((edge) => edge.type === "tlm");
      expect(tlmEdge).toBeDefined();
      expect(tlmEdge!.from).toBe("driver_1");
      expect(tlmEdge!.to).toBe("monitor_1");
    });

    it("should create config edges for parent-child relationships", () => {
      const spec: TestbenchSpecification = {
        rtl: {
          moduleName: "test",
          ports: [],
        },
        verification: {
          testCases: [],
          coverageGoals: [],
        },
        components: [
          {
            id: "agent_1",
            type: "agent",
            name: "Agent",
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: "Driver",
              },
            ],
          },
        ],
        signals: [],
        clocks: [],
      };

      const graph = builder.buildGraph(spec);

      const configEdge = graph.edges.find((edge) => edge.type === "config");
      expect(configEdge).toBeDefined();
      expect(configEdge!.from).toBe("agent_1");
      expect(configEdge!.to).toBe("driver_1");
    });
  });
});
