/**
 * Signal Time Series
 * Manages time series data for signals with efficient lookup methods
 */

import { Transition, SignalValue } from "../types/simulation";

/**
 * SignalTimeSeries class
 * Provides efficient time-based value lookup and range queries for signal data
 */
export class SignalTimeSeries {
  private signalId: string;
  private transitions: Transition[];

  constructor(signalId: string, transitions: Transition[] = []) {
    this.signalId = signalId;
    // Sort transitions by time for efficient lookup
    this.transitions = [...transitions].sort((a, b) => a.time - b.time);
  }

  /**
   * Get the signal ID
   */
  getSignalId(): string {
    return this.signalId;
  }

  /**
   * Get all transitions
   */
  getTransitions(): Transition[] {
    return [...this.transitions];
  }

  /**
   * Get signal value at a specific time
   * Uses binary search for O(log n) lookup
   */
  getValueAt(time: number): SignalValue {
    if (this.transitions.length === 0) {
      return {
        type: "binary",
        value: "X",
        isUnknown: true,
      };
    }

    // If time is before first transition, return unknown
    if (time < this.transitions[0].time) {
      return {
        type: "binary",
        value: "X",
        isUnknown: true,
      };
    }

    // Binary search to find the transition at or before the given time
    let left = 0;
    let right = this.transitions.length - 1;
    let result = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      if (this.transitions[mid].time <= time) {
        result = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    const transition = this.transitions[result];
    return this.convertToSignalValue(transition.value);
  }

  /**
   * Get transitions within a time range
   * Returns all transitions where startTime <= transition.time <= endTime
   */
  getTransitionsInRange(startTime: number, endTime: number): Transition[] {
    if (this.transitions.length === 0) {
      return [];
    }

    // Find the first transition >= startTime using binary search
    const startIndex = this.findFirstTransitionAtOrAfter(startTime);
    if (startIndex === -1) {
      return [];
    }

    // Collect all transitions until we exceed endTime
    const result: Transition[] = [];
    for (let i = startIndex; i < this.transitions.length; i++) {
      if (this.transitions[i].time > endTime) {
        break;
      }
      result.push({ ...this.transitions[i] });
    }

    return result;
  }

  /**
   * Add a new transition
   * Maintains sorted order
   */
  addTransition(transition: Transition): void {
    // Find insertion point using binary search
    let left = 0;
    let right = this.transitions.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.transitions[mid].time < transition.time) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    this.transitions.splice(left, 0, { ...transition });
  }

  /**
   * Add multiple transitions
   * More efficient than adding one at a time
   */
  addTransitions(transitions: Transition[]): void {
    this.transitions.push(...transitions);
    this.transitions.sort((a, b) => a.time - b.time);
  }

  /**
   * Clear all transitions
   */
  clear(): void {
    this.transitions = [];
  }

  /**
   * Get the time range covered by this signal
   */
  getTimeRange(): { start: number; end: number } | null {
    if (this.transitions.length === 0) {
      return null;
    }

    return {
      start: this.transitions[0].time,
      end: this.transitions[this.transitions.length - 1].time,
    };
  }

  /**
   * Get the number of transitions
   */
  getTransitionCount(): number {
    return this.transitions.length;
  }

  /**
   * Find the first transition at or after the given time
   * Returns -1 if no such transition exists
   */
  private findFirstTransitionAtOrAfter(time: number): number {
    if (this.transitions.length === 0) {
      return -1;
    }

    // If time is after all transitions, return -1
    if (time > this.transitions[this.transitions.length - 1].time) {
      return -1;
    }

    // Binary search for first transition >= time
    let left = 0;
    let right = this.transitions.length - 1;
    let result = -1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);

      if (this.transitions[mid].time >= time) {
        result = mid;
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    return result;
  }

  /**
   * Convert a transition value to SignalValue
   */
  private convertToSignalValue(value: string | number): SignalValue {
    // Check if value is unknown (X or Z)
    if (value === "X" || value === "Z" || value === "x" || value === "z") {
      return {
        type: "binary",
        value: value.toString().toUpperCase(),
        isUnknown: true,
      };
    }

    // Determine type based on value
    if (typeof value === "number") {
      return {
        type: "decimal",
        value,
        isUnknown: false,
      };
    }

    // String value - check if it's hex
    const strValue = value.toString();
    if (strValue.startsWith("0x") || strValue.startsWith("0X")) {
      return {
        type: "hex",
        value: strValue,
        isUnknown: false,
      };
    }

    // Default to binary
    return {
      type: "binary",
      value: strValue,
      isUnknown: false,
    };
  }
}
