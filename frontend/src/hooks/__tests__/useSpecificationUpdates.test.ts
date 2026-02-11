/**
 * useSpecificationUpdates Hook Tests
 * Unit tests for the specification updates hook
 */

import { renderHook, act } from "@testing-library/react";
import {
  useSpecificationUpdates,
  mergeSpecificationChanges,
} from "../useSpecificationUpdates";
import {
  TestbenchSpecification,
  SpecificationChanges,
} from "../../types/simulation";
import { ComponentGraphBuilder } from "../../services/ComponentGraphBuilder";

describe("useSpecificationUpdates", () => {
  const baseSpec: TestbenchSpecification = {
    rtl: {
      moduleName: "test_module",
      ports: [{ name: "clk", direction: "input", width: 1 }],
    },
    verification: {
      testCases: [],
      coverageGoals: [],
    },
    components: [
      {
        id: "env_1",
        type: "env",
        name: "test_env",
      },
    ],
    signals: [{ name: "clk", type: "clock", bitWidth: 1 }],
    clocks: [{ name: "clk", period: 10, dutyCycle: 0.5, phase: 0 }],
  };

  it("should initialize without changes", () => {
    const { result } = renderHook(() =>
      useSpecificationUpdates({
        specification: baseSpec,
        graphBuilder: null,
      }),
    );

    expect(result.current.hasChanges).toBe(false);
  });

  it("should detect added components", () => {
    const onUpdate = jest.fn();

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: baseSpec } },
    );

    const updatedSpec: TestbenchSpecification = {
      ...baseSpec,
      components: [
        ...baseSpec.components,
        {
          id: "agent_1",
          type: "agent",
          name: "test_agent",
        },
      ],
    };

    rerender({ spec: updatedSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.addedComponents).toHaveLength(1);
    expect(changes.addedComponents[0].id).toBe("agent_1");
  });

  it("should detect removed components", () => {
    const onUpdate = jest.fn();

    const specWithMultipleComponents: TestbenchSpecification = {
      ...baseSpec,
      components: [
        ...baseSpec.components,
        {
          id: "agent_1",
          type: "agent",
          name: "test_agent",
        },
      ],
    };

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: specWithMultipleComponents } },
    );

    rerender({ spec: baseSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.removedComponents).toHaveLength(1);
    expect(changes.removedComponents[0]).toBe("agent_1");
  });

  it("should detect added signals", () => {
    const onUpdate = jest.fn();

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: baseSpec } },
    );

    const updatedSpec: TestbenchSpecification = {
      ...baseSpec,
      signals: [
        ...baseSpec.signals,
        { name: "data", type: "data", bitWidth: 8 },
      ],
    };

    rerender({ spec: updatedSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.addedSignals).toHaveLength(1);
    expect(changes.addedSignals[0].name).toBe("data");
  });

  it("should detect removed signals", () => {
    const onUpdate = jest.fn();

    const specWithMultipleSignals: TestbenchSpecification = {
      ...baseSpec,
      signals: [
        ...baseSpec.signals,
        { name: "data", type: "data", bitWidth: 8 },
      ],
    };

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: specWithMultipleSignals } },
    );

    rerender({ spec: baseSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.removedSignals).toHaveLength(1);
    expect(changes.removedSignals[0]).toBe("data");
  });

  it("should detect added clocks", () => {
    const onUpdate = jest.fn();

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: baseSpec } },
    );

    const updatedSpec: TestbenchSpecification = {
      ...baseSpec,
      clocks: [
        ...baseSpec.clocks,
        { name: "clk2", period: 20, dutyCycle: 0.5, phase: 0 },
      ],
    };

    rerender({ spec: updatedSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.addedClocks).toHaveLength(1);
    expect(changes.addedClocks[0].name).toBe("clk2");
  });

  it("should detect removed clocks", () => {
    const onUpdate = jest.fn();

    const specWithMultipleClocks: TestbenchSpecification = {
      ...baseSpec,
      clocks: [
        ...baseSpec.clocks,
        { name: "clk2", period: 20, dutyCycle: 0.5, phase: 0 },
      ],
    };

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: specWithMultipleClocks } },
    );

    rerender({ spec: baseSpec });

    expect(onUpdate).toHaveBeenCalled();
    const changes = onUpdate.mock.calls[0][0] as SpecificationChanges;
    expect(changes.removedClocks).toHaveLength(1);
    expect(changes.removedClocks[0]).toBe("clk2");
  });

  it("should update graph builder when provided", () => {
    const graphBuilder = new ComponentGraphBuilder();
    const updateGraphSpy = jest.spyOn(graphBuilder, "updateGraph");

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder,
        }),
      { initialProps: { spec: baseSpec } },
    );

    const updatedSpec: TestbenchSpecification = {
      ...baseSpec,
      components: [
        ...baseSpec.components,
        {
          id: "agent_1",
          type: "agent",
          name: "test_agent",
        },
      ],
    };

    rerender({ spec: updatedSpec });

    expect(updateGraphSpy).toHaveBeenCalled();
  });

  it("should handle errors gracefully", () => {
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useSpecificationUpdates({
        specification: baseSpec,
        graphBuilder: null,
        onError,
      }),
    );

    // Manually trigger an error by passing invalid data
    act(() => {
      result.current.updateSpecification(null as any);
    });

    expect(onError).toHaveBeenCalled();
  });

  it("should not call onUpdate when no changes", () => {
    const onUpdate = jest.fn();

    const { rerender } = renderHook(
      ({ spec }) =>
        useSpecificationUpdates({
          specification: spec,
          graphBuilder: null,
          onUpdate,
        }),
      { initialProps: { spec: baseSpec } },
    );

    // Re-render with same spec
    rerender({ spec: baseSpec });

    // onUpdate should not be called for identical spec
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe("mergeSpecificationChanges", () => {
  const baseSpec: TestbenchSpecification = {
    rtl: {
      moduleName: "test_module",
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
        name: "test_env",
      },
    ],
    signals: [{ name: "clk", type: "clock", bitWidth: 1 }],
    clocks: [{ name: "clk", period: 10, dutyCycle: 0.5, phase: 0 }],
  };

  it("should merge added components", () => {
    const changes: SpecificationChanges = {
      addedComponents: [
        {
          id: "agent_1",
          type: "agent",
          name: "test_agent",
        },
      ],
      removedComponents: [],
      addedSignals: [],
      removedSignals: [],
      addedClocks: [],
      removedClocks: [],
    };

    const merged = mergeSpecificationChanges(baseSpec, changes);

    expect(merged.components).toHaveLength(2);
    expect(merged.components[1].id).toBe("agent_1");
  });

  it("should merge removed components", () => {
    const changes: SpecificationChanges = {
      addedComponents: [],
      removedComponents: ["env_1"],
      addedSignals: [],
      removedSignals: [],
      addedClocks: [],
      removedClocks: [],
    };

    const merged = mergeSpecificationChanges(baseSpec, changes);

    expect(merged.components).toHaveLength(0);
  });

  it("should merge signal changes", () => {
    const changes: SpecificationChanges = {
      addedComponents: [],
      removedComponents: [],
      addedSignals: [{ name: "data", type: "data", bitWidth: 8 }],
      removedSignals: ["clk"],
      addedClocks: [],
      removedClocks: [],
    };

    const merged = mergeSpecificationChanges(baseSpec, changes);

    expect(merged.signals).toHaveLength(1);
    expect(merged.signals[0].name).toBe("data");
  });

  it("should merge clock changes", () => {
    const changes: SpecificationChanges = {
      addedComponents: [],
      removedComponents: [],
      addedSignals: [],
      removedSignals: [],
      addedClocks: [{ name: "clk2", period: 20, dutyCycle: 0.5, phase: 0 }],
      removedClocks: ["clk"],
    };

    const merged = mergeSpecificationChanges(baseSpec, changes);

    expect(merged.clocks).toHaveLength(1);
    expect(merged.clocks[0].name).toBe("clk2");
  });
});
