/**
 * Simulation Engine
 * Manages the simulation animation loop and state updates
 */

import { SimulationState, SimulationEvent } from "../types/simulation";

type StateUpdateCallback = (state: SimulationState) => void;

/**
 * SimulationEngine class
 * Responsible for managing simulation playback and state
 */
export class SimulationEngine {
  private state: SimulationState;
  private speedMultiplier: number;
  private animationFrameId: number | null;
  private lastFrameTime: number;
  private callbacks: Set<StateUpdateCallback>;

  constructor() {
    this.state = {
      isRunning: false,
      currentTime: 0,
      cycleCount: 0,
      phase: "reset",
      events: [],
    };
    this.speedMultiplier = 1.0;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.callbacks = new Set();
  }

  /**
   * Start the simulation animation
   */
  start(): void {
    if (this.state.isRunning) {
      return; // Already running
    }

    this.state.isRunning = true;
    this.lastFrameTime = performance.now();
    this.notifyCallbacks();
    this.animate();
  }

  /**
   * Pause the simulation
   */
  pause(): void {
    if (!this.state.isRunning) {
      return; // Already paused
    }

    this.state.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyCallbacks();
  }

  /**
   * Resume the simulation
   */
  resume(): void {
    if (this.state.isRunning) {
      return; // Already running
    }

    this.state.isRunning = true;
    this.lastFrameTime = performance.now();
    this.notifyCallbacks();
    this.animate();
  }

  /**
   * Reset simulation to initial state
   */
  reset(): void {
    // Stop animation if running
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Reset state
    this.state = {
      isRunning: false,
      currentTime: 0,
      cycleCount: 0,
      phase: "reset",
      events: [],
    };

    this.lastFrameTime = 0;
    this.notifyCallbacks();
  }

  /**
   * Set simulation speed multiplier
   */
  setSpeed(multiplier: number): void {
    if (multiplier <= 0) {
      throw new Error("Speed multiplier must be positive");
    }
    this.speedMultiplier = multiplier;
  }

  /**
   * Get current simulation state
   */
  getState(): SimulationState {
    // Return a copy to prevent external modification
    return {
      ...this.state,
      events: [...this.state.events],
    };
  }

  /**
   * Register callback for state updates
   */
  onStateUpdate(callback: StateUpdateCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Add a simulation event
   */
  addEvent(event: SimulationEvent): void {
    this.state.events.push(event);
    this.notifyCallbacks();
  }

  /**
   * Clear all events
   */
  clearEvents(): void {
    this.state.events = [];
    this.notifyCallbacks();
  }

  /**
   * Set simulation phase
   */
  setPhase(phase: SimulationState["phase"]): void {
    if (this.state.phase !== phase) {
      this.state.phase = phase;

      // Add phase change event
      this.addEvent({
        time: this.state.currentTime,
        type: "phase_change",
        description: `Phase changed to ${phase}`,
        severity: "info",
      });
    }
  }

  /**
   * Animation loop
   */
  private animate = (): void => {
    if (!this.state.isRunning) {
      return;
    }

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    // Update simulation time based on delta and speed multiplier
    // Assuming 1ms real time = 1 time unit at 1x speed
    const timeIncrement = deltaTime * this.speedMultiplier;
    this.state.currentTime += timeIncrement;

    // Update cycle count (assuming 10 time units per cycle)
    this.state.cycleCount = Math.floor(this.state.currentTime / 10);

    // Update phase based on time
    this.updatePhase();

    // Notify callbacks
    this.notifyCallbacks();

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Update simulation phase based on current time
   */
  private updatePhase(): void {
    const time = this.state.currentTime;

    if (time < 100) {
      if (this.state.phase !== "reset") {
        this.setPhase("reset");
      }
    } else if (time < 500) {
      if (this.state.phase !== "stimulus") {
        this.setPhase("stimulus");
      }
    } else if (time < 1000) {
      if (this.state.phase !== "checking") {
        this.setPhase("checking");
      }
    } else {
      if (this.state.phase !== "complete") {
        this.setPhase("complete");
        this.pause(); // Auto-pause when complete
      }
    }
  }

  /**
   * Notify all registered callbacks
   */
  private notifyCallbacks(): void {
    const stateCopy = this.getState();
    this.callbacks.forEach((callback) => {
      try {
        callback(stateCopy);
      } catch (error) {
        console.error("Error in state update callback:", error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.callbacks.clear();
  }
}

// Export singleton instance
export const simulationEngine = new SimulationEngine();
