/**
 * Visualization Initializer Hook
 * Initializes simulation visualization when testbench generation completes
 */

import { useEffect, useState, useCallback } from "react";
import { SpecificationParser } from "../services/SpecificationParser";
import { TestbenchSpecification, VisualizationData } from "../types/simulation";

interface UseVisualizationInitializerOptions {
  projectId: string;
  generationStatus: "idle" | "generating" | "completed" | "failed";
  onInitialized?: (data: VisualizationData) => void;
  onError?: (error: Error) => void;
}

interface UseVisualizationInitializerResult {
  visualizationData: VisualizationData | null;
  isInitializing: boolean;
  error: Error | null;
  initialize: (specification: TestbenchSpecification) => void;
  reset: () => void;
}

/**
 * Hook to initialize visualization when testbench generation completes
 */
export const useVisualizationInitializer = ({
  projectId,
  generationStatus,
  onInitialized,
  onError,
}: UseVisualizationInitializerOptions): UseVisualizationInitializerResult => {
  const [visualizationData, setVisualizationData] =
    useState<VisualizationData | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [parser] = useState(() => new SpecificationParser());

  // Initialize visualization from specification
  const initialize = useCallback(
    (specification: TestbenchSpecification) => {
      setIsInitializing(true);
      setError(null);

      try {
        // Validate specification
        const validation = parser.validate(specification);

        if (!validation.isValid) {
          throw new Error(
            `Invalid specification: ${validation.errors.join(", ")}`,
          );
        }

        // Parse specification to extract visualization data
        const data = parser.parse(specification);

        setVisualizationData(data);
        setIsInitializing(false);

        // Call success callback
        if (onInitialized) {
          onInitialized(data);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        setIsInitializing(false);

        // Call error callback
        if (onError) {
          onError(error);
        }
      }
    },
    [parser, onInitialized, onError],
  );

  // Reset visualization state
  const reset = useCallback(() => {
    setVisualizationData(null);
    setError(null);
    setIsInitializing(false);
  }, []);

  // Auto-initialize when generation completes
  useEffect(() => {
    // Only auto-initialize if we don't have data yet and generation just completed
    if (
      generationStatus === "completed" &&
      !visualizationData &&
      !isInitializing
    ) {
      // Note: In a real implementation, we would fetch the specification from the API
      // For now, we just set a flag that initialization is ready
      console.log(`Visualization ready to initialize for project ${projectId}`);
    }
  }, [generationStatus, visualizationData, isInitializing, projectId]);

  // Reset when project changes
  useEffect(() => {
    reset();
  }, [projectId, reset]);

  return {
    visualizationData,
    isInitializing,
    error,
    initialize,
    reset,
  };
};

/**
 * Helper function to create a sample specification for testing
 * In production, this would come from the backend
 */
export const createSampleSpecification = (
  projectName: string,
): TestbenchSpecification => {
  return {
    rtl: {
      moduleName: projectName.toLowerCase().replace(/\s+/g, "_"),
      ports: [
        { name: "clk", direction: "input", width: 1 },
        { name: "rst_n", direction: "input", width: 1 },
        { name: "data_in", direction: "input", width: 8 },
        { name: "data_out", direction: "output", width: 8 },
      ],
    },
    verification: {
      testCases: [
        { name: "smoke_test", description: "Basic functionality test" },
        { name: "random_test", description: "Random stimulus test" },
      ],
      coverageGoals: [{ name: "functional_coverage", target: 100 }],
    },
    components: [
      {
        id: "env_1",
        type: "env",
        name: `${projectName.toLowerCase()}_env`,
        children: [
          {
            id: "agent_1",
            type: "agent",
            name: `${projectName.toLowerCase()}_agent`,
            children: [
              {
                id: "driver_1",
                type: "driver",
                name: `${projectName.toLowerCase()}_driver`,
              },
              {
                id: "monitor_1",
                type: "monitor",
                name: `${projectName.toLowerCase()}_monitor`,
              },
              {
                id: "sequencer_1",
                type: "sequencer",
                name: `${projectName.toLowerCase()}_sequencer`,
              },
            ],
          },
          {
            id: "scoreboard_1",
            type: "scoreboard",
            name: `${projectName.toLowerCase()}_scoreboard`,
          },
        ],
      },
    ],
    signals: [
      { name: "clk", type: "clock", bitWidth: 1 },
      { name: "rst_n", type: "control", bitWidth: 1 },
      { name: "data_in", type: "data", bitWidth: 8 },
      { name: "data_out", type: "data", bitWidth: 8 },
    ],
    clocks: [
      {
        name: "clk",
        period: 10,
        dutyCycle: 0.5,
        phase: 0,
      },
    ],
  };
};
