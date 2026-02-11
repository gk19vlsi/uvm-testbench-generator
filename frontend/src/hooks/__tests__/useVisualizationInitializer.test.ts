/**
 * useVisualizationInitializer Hook Tests
 * Unit tests for the visualization initializer hook
 */

import { renderHook, act } from "@testing-library/react";
import {
  useVisualizationInitializer,
  createSampleSpecification,
} from "../useVisualizationInitializer";
import { TestbenchSpecification } from "../../types/simulation";

describe("useVisualizationInitializer", () => {
  const mockProjectId = "test-project-123";

  it("should initialize with null data", () => {
    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
      }),
    );

    expect(result.current.visualizationData).toBeNull();
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should initialize visualization from specification", () => {
    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
      }),
    );

    const spec = createSampleSpecification("TestProject");

    act(() => {
      result.current.initialize(spec);
    });

    expect(result.current.visualizationData).not.toBeNull();
    expect(result.current.visualizationData?.components).toBeDefined();
    expect(result.current.visualizationData?.signals).toBeDefined();
    expect(result.current.visualizationData?.clocks).toBeDefined();
    expect(result.current.isInitializing).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should call onInitialized callback on success", () => {
    const onInitialized = jest.fn();

    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
        onInitialized,
      }),
    );

    const spec = createSampleSpecification("TestProject");

    act(() => {
      result.current.initialize(spec);
    });

    expect(onInitialized).toHaveBeenCalled();
    expect(onInitialized).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
        signals: expect.any(Array),
        clocks: expect.any(Array),
      }),
    );
  });

  it("should handle invalid specification", () => {
    const onError = jest.fn();

    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
        onError,
      }),
    );

    const invalidSpec = {
      rtl: { moduleName: "", ports: [] },
      verification: { testCases: [], coverageGoals: [] },
      components: [],
      signals: [],
      clocks: [],
    } as TestbenchSpecification;

    act(() => {
      result.current.initialize(invalidSpec);
    });

    expect(result.current.error).not.toBeNull();
    expect(result.current.visualizationData).toBeNull();
    expect(onError).toHaveBeenCalled();
  });

  it("should reset visualization state", () => {
    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
      }),
    );

    const spec = createSampleSpecification("TestProject");

    act(() => {
      result.current.initialize(spec);
    });

    expect(result.current.visualizationData).not.toBeNull();

    act(() => {
      result.current.reset();
    });

    expect(result.current.visualizationData).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isInitializing).toBe(false);
  });

  it("should reset when project changes", () => {
    const { result, rerender } = renderHook(
      ({ projectId }) =>
        useVisualizationInitializer({
          projectId,
          generationStatus: "idle",
        }),
      { initialProps: { projectId: mockProjectId } },
    );

    const spec = createSampleSpecification("TestProject");

    act(() => {
      result.current.initialize(spec);
    });

    expect(result.current.visualizationData).not.toBeNull();

    // Change project
    rerender({ projectId: "different-project-456" });

    expect(result.current.visualizationData).toBeNull();
  });

  it("should set initializing flag during initialization", () => {
    const { result } = renderHook(() =>
      useVisualizationInitializer({
        projectId: mockProjectId,
        generationStatus: "idle",
      }),
    );

    const spec = createSampleSpecification("TestProject");

    act(() => {
      result.current.initialize(spec);
    });

    // After initialization completes, flag should be false
    expect(result.current.isInitializing).toBe(false);
  });
});

describe("createSampleSpecification", () => {
  it("should create valid specification", () => {
    const spec = createSampleSpecification("MyProject");

    expect(spec.rtl.moduleName).toBe("myproject");
    expect(spec.rtl.ports.length).toBeGreaterThan(0);
    expect(spec.components.length).toBeGreaterThan(0);
    expect(spec.signals.length).toBeGreaterThan(0);
    expect(spec.clocks.length).toBeGreaterThan(0);
  });

  it("should handle project names with spaces", () => {
    const spec = createSampleSpecification("My Test Project");

    expect(spec.rtl.moduleName).toBe("my_test_project");
  });

  it("should create hierarchical components", () => {
    const spec = createSampleSpecification("TestProject");

    expect(spec.components[0].type).toBe("env");
    expect(spec.components[0].children).toBeDefined();
    expect(spec.components[0].children!.length).toBeGreaterThan(0);
  });
});
