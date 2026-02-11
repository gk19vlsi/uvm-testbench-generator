/**
 * Specification Updates Hook
 * Handles reactive updates when testbench specifications change
 */

import { useEffect, useCallback, useRef } from "react";
import {
  TestbenchSpecification,
  SpecificationChanges,
} from "../types/simulation";
import { ComponentGraphBuilder } from "../services/ComponentGraphBuilder";

interface UseSpecificationUpdatesOptions {
  specification: TestbenchSpecification | null;
  graphBuilder: ComponentGraphBuilder | null;
  onUpdate?: (changes: SpecificationChanges) => void;
  onError?: (error: Error) => void;
}

interface UseSpecificationUpdatesResult {
  updateSpecification: (newSpec: TestbenchSpecification) => void;
  hasChanges: boolean;
}

/**
 * Hook to handle reactive specification updates
 * Detects changes and updates visualization accordingly
 */
export const useSpecificationUpdates = ({
  specification,
  graphBuilder,
  onUpdate,
  onError,
}: UseSpecificationUpdatesOptions): UseSpecificationUpdatesResult => {
  const previousSpecRef = useRef<TestbenchSpecification | null>(null);
  const hasChangesRef = useRef(false);

  // Detect changes between specifications
  const detectChanges = useCallback(
    (
      oldSpec: TestbenchSpecification,
      newSpec: TestbenchSpecification,
    ): SpecificationChanges => {
      const changes: SpecificationChanges = {
        addedComponents: [],
        removedComponents: [],
        addedSignals: [],
        removedSignals: [],
        addedClocks: [],
        removedClocks: [],
      };

      // Detect component changes
      const oldComponentIds = new Set(oldSpec.components.map((c) => c.id));
      const newComponentIds = new Set(newSpec.components.map((c) => c.id));

      // Find added components
      newSpec.components.forEach((component) => {
        if (!oldComponentIds.has(component.id)) {
          changes.addedComponents.push(component);
        }
      });

      // Find removed components
      oldSpec.components.forEach((component) => {
        if (!newComponentIds.has(component.id)) {
          changes.removedComponents.push(component.id);
        }
      });

      // Detect signal changes
      const oldSignalNames = new Set(oldSpec.signals.map((s) => s.name));
      const newSignalNames = new Set(newSpec.signals.map((s) => s.name));

      // Find added signals
      newSpec.signals.forEach((signal) => {
        if (!oldSignalNames.has(signal.name)) {
          changes.addedSignals.push(signal);
        }
      });

      // Find removed signals
      oldSpec.signals.forEach((signal) => {
        if (!newSignalNames.has(signal.name)) {
          changes.removedSignals.push(signal.name);
        }
      });

      // Detect clock changes
      const oldClockNames = new Set(oldSpec.clocks.map((c) => c.name));
      const newClockNames = new Set(newSpec.clocks.map((c) => c.name));

      // Find added clocks
      newSpec.clocks.forEach((clock) => {
        if (!oldClockNames.has(clock.name)) {
          changes.addedClocks.push(clock);
        }
      });

      // Find removed clocks
      oldSpec.clocks.forEach((clock) => {
        if (!newClockNames.has(clock.name)) {
          changes.removedClocks.push(clock.name);
        }
      });

      return changes;
    },
    [],
  );

  // Update specification and apply changes
  const updateSpecification = useCallback(
    (newSpec: TestbenchSpecification) => {
      try {
        const oldSpec = previousSpecRef.current;

        if (!oldSpec) {
          // First time initialization
          previousSpecRef.current = newSpec;
          hasChangesRef.current = false;
          return;
        }

        // Detect changes
        const changes = detectChanges(oldSpec, newSpec);

        // Check if there are any changes
        const hasChanges =
          changes.addedComponents.length > 0 ||
          changes.removedComponents.length > 0 ||
          changes.addedSignals.length > 0 ||
          changes.removedSignals.length > 0 ||
          changes.addedClocks.length > 0 ||
          changes.removedClocks.length > 0;

        if (hasChanges) {
          hasChangesRef.current = true;

          // Update graph builder if available
          if (graphBuilder) {
            graphBuilder.updateGraph(changes);
          }

          // Call update callback
          if (onUpdate) {
            onUpdate(changes);
          }

          console.log("Specification updated:", changes);
        }

        // Update reference
        previousSpecRef.current = newSpec;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        if (onError) {
          onError(error);
        }

        console.error("Error updating specification:", error);
      }
    },
    [detectChanges, graphBuilder, onUpdate, onError],
  );

  // Watch for specification changes
  useEffect(() => {
    if (specification) {
      updateSpecification(specification);
    }
  }, [specification, updateSpecification]);

  return {
    updateSpecification,
    hasChanges: hasChangesRef.current,
  };
};

/**
 * Helper function to merge specification changes
 */
export const mergeSpecificationChanges = (
  baseSpec: TestbenchSpecification,
  changes: SpecificationChanges,
): TestbenchSpecification => {
  const newSpec: TestbenchSpecification = {
    ...baseSpec,
    components: [
      ...baseSpec.components.filter(
        (c) => !changes.removedComponents.includes(c.id),
      ),
      ...changes.addedComponents,
    ],
    signals: [
      ...baseSpec.signals.filter(
        (s) => !changes.removedSignals.includes(s.name),
      ),
      ...changes.addedSignals,
    ],
    clocks: [
      ...baseSpec.clocks.filter((c) => !changes.removedClocks.includes(c.name)),
      ...changes.addedClocks,
    ],
  };

  return newSpec;
};
