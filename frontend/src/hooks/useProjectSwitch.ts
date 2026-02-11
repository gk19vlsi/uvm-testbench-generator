/**
 * useProjectSwitch Hook
 * React hook for handling project switching in visualization context
 */

import { useEffect, useCallback, useRef } from "react";
import { SimulationEngine } from "../services/SimulationEngine";
import { VisualizationPersistence } from "../services/VisualizationPersistence";

interface UseProjectSwitchOptions {
  projectId: string;
  engine: SimulationEngine;
  onProjectSwitch?: (projectId: string) => void;
}

interface UseProjectSwitchReturn {
  switchProject: (newProjectId: string) => void;
  clearVisualizationState: () => void;
  isTransitioning: boolean;
}

/**
 * Hook for managing project switching and visualization state cleanup
 */
export const useProjectSwitch = ({
  projectId,
  engine,
  onProjectSwitch,
}: UseProjectSwitchOptions): UseProjectSwitchReturn => {
  const previousProjectIdRef = useRef<string>(projectId);
  const isTransitioningRef = useRef<boolean>(false);

  // Detect project switch
  useEffect(() => {
    if (projectId !== previousProjectIdRef.current) {
      handleProjectSwitch(projectId);
      previousProjectIdRef.current = projectId;
    }
  }, [projectId]);

  /**
   * Handle project switch
   */
  const handleProjectSwitch = useCallback(
    (newProjectId: string) => {
      isTransitioningRef.current = true;

      // Clear previous project visualization state
      clearVisualizationState();

      // Notify callback
      if (onProjectSwitch) {
        onProjectSwitch(newProjectId);
      }

      // Small delay to ensure cleanup is complete
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
    },
    [onProjectSwitch],
  );

  /**
   * Clear visualization state
   */
  const clearVisualizationState = useCallback(() => {
    // Reset simulation engine
    engine.reset();
    engine.clearEvents();

    // Note: We don't clear localStorage settings here
    // Settings are loaded per-project and should persist
  }, [engine]);

  /**
   * Manually switch to a new project
   */
  const switchProject = useCallback(
    (newProjectId: string) => {
      if (newProjectId === projectId) {
        return; // Already on this project
      }

      handleProjectSwitch(newProjectId);
    },
    [projectId, handleProjectSwitch],
  );

  return {
    switchProject,
    clearVisualizationState,
    isTransitioning: isTransitioningRef.current,
  };
};
