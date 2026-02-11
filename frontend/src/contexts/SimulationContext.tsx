/**
 * Simulation Context
 * React context for managing simulation state across components
 * Provides centralized state management and real-time updates
 * Includes project switching and settings persistence
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { SimulationEngine } from "../services/SimulationEngine";
import { SimulationState, ViewTransform } from "../types/simulation";
import { useVisualizationSettings } from "../hooks/useVisualizationSettings";
import { useProjectSwitch } from "../hooks/useProjectSwitch";

interface SimulationContextValue {
  engine: SimulationEngine;
  state: SimulationState;
  isRunning: boolean;
  currentTime: number;
  cycleCount: number;
  phase: SimulationState["phase"];
  events: SimulationState["events"];
  
  // Control methods
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (multiplier: number) => void;
  
  // Settings and persistence
  viewTransform: ViewTransform;
  selectedSignals: string[];
  expandedComponents: Record<string, boolean>;
  theme: "light" | "dark";
  setViewTransform: (transform: ViewTransform) => void;
  setSelectedSignals: (signals: string[]) => void;
  setExpandedComponents: (components: Record<string, boolean>) => void;
  setTheme: (theme: "light" | "dark") => void;
  saveSettings: () => void;
  resetSettings: () => void;
  
  // Project switching
  projectId: string;
  switchProject: (newProjectId: string) => void;
  isTransitioning: boolean;
}

const SimulationContext = createContext<SimulationContextValue | undefined>(undefined);

interface SimulationProviderProps {
  engine: SimulationEngine;
  projectId: string;
  children: React.ReactNode;
}

/**
 * SimulationProvider component
 * Wraps the application and provides simulation state to all children
 */
export const SimulationProvider: React.FC<SimulationProviderProps> = ({
  engine,
  projectId,
  children,
}) => {
  const [state, setState] = useState<SimulationState>(engine.getState());

  // Use visualization settings hook
  const {
    viewTransform,
    selectedSignals,
    expandedComponents,
    theme,
    setViewTransform,
    setSelectedSignals,
    setExpandedComponents,
    setTheme,
    saveSettings,
    resetSettings,
  } = useVisualizationSettings({ projectId });

  // Use project switch hook
  const { switchProject, isTransitioning } = useProjectSwitch({
    projectId,
    engine,
    onProjectSwitch: (newProjectId) => {
      console.log(`Switched to project: ${newProjectId}`);
    },
  });

  // Subscribe to engine state updates
  useEffect(() => {
    const unsubscribe = engine.onStateUpdate((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(engine.getState());

    return () => {
      unsubscribe();
    };
  }, [engine]);

  // Control methods
  const start = useCallback(() => {
    engine.start();
  }, [engine]);

  const pause = useCallback(() => {
    engine.pause();
  }, [engine]);

  const resume = useCallback(() => {
    engine.resume();
  }, [engine]);

  const reset = useCallback(() => {
    engine.reset();
  }, [engine]);

  const setSpeed = useCallback(
    (multiplier: number) => {
      engine.setSpeed(multiplier);
    },
    [engine],
  );

  const value: SimulationContextValue = {
    engine,
    state,
    isRunning: state.isRunning,
    currentTime: state.currentTime,
    cycleCount: state.cycleCount,
    phase: state.phase,
    events: state.events,
    start,
    pause,
    resume,
    reset,
    setSpeed,
    viewTransform,
    selectedSignals,
    expandedComponents,
    theme,
    setViewTransform,
    setSelectedSignals,
    setExpandedComponents,
    setTheme,
    saveSettings,
    resetSettings,
    projectId,
    switchProject,
    isTransitioning,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

/**
 * useSimulation hook
 * Access simulation state and controls from any component
 */
export const useSimulation = (): SimulationContextValue => {
  const context = useContext(SimulationContext);
  
  if (context === undefined) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  
  return context;
};

/**
 * useSimulationState hook
 * Access only the simulation state (for components that don't need controls)
 */
export const useSimulationState = (): SimulationState => {
  const { state } = useSimulation();
  return state;
};

/**
 * useSimulationControls hook
 * Access only the control methods (for control components)
 */
export const useSimulationControls = () => {
  const { start, pause, resume, reset, setSpeed } = useSimulation();
  return { start, pause, resume, reset, setSpeed };
};
