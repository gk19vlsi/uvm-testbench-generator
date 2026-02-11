/**
 * Specification Parser
 * Parses testbench specifications to extract visualization data
 */

import {
  TestbenchSpecification,
  VisualizationData,
  ValidationResult,
  ComponentNode,
  Signal,
  ClockSignal,
  TimelineConfig,
  UVMComponentSpec,
  SignalSpec,
  ClockSpec,
} from "../types/simulation";

/**
 * Default colors for different signal types
 */
const SIGNAL_TYPE_COLORS = {
  clock: "#3B82F6", // blue
  data: "#10B981", // green
  control: "#F59E0B", // amber
};

/**
 * SpecificationParser class
 * Responsible for parsing and validating testbench specifications
 */
export class SpecificationParser {
  /**
   * Parse a testbench specification and extract visualization data
   */
  parse(spec: TestbenchSpecification): VisualizationData {
    // Validate first
    const validation = this.validate(spec);
    if (!validation.isValid) {
      throw new Error(`Invalid specification: ${validation.errors.join(", ")}`);
    }

    // Extract components
    const components = this.parseComponents(spec.components);

    // Extract signals
    const signals = this.parseSignals(spec.signals);

    // Extract clocks
    const clocks = this.parseClocks(spec.clocks);

    // Create timeline configuration
    const timeline = this.createTimelineConfig(spec);

    return {
      components,
      signals,
      clocks,
      timeline,
    };
  }

  /**
   * Validate a testbench specification
   */
  validate(spec: TestbenchSpecification): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for required fields
    if (!spec) {
      errors.push("Specification is null or undefined");
      return { isValid: false, errors, warnings };
    }

    if (!spec.rtl) {
      errors.push("RTL description is missing");
    } else {
      if (!spec.rtl.moduleName || spec.rtl.moduleName.trim() === "") {
        errors.push("RTL module name is missing or empty");
      }
      if (!spec.rtl.ports || spec.rtl.ports.length === 0) {
        warnings.push("RTL has no ports defined");
      }
    }

    if (!spec.verification) {
      errors.push("Verification plan is missing");
    }

    if (!spec.components || spec.components.length === 0) {
      errors.push("No UVM components defined");
    } else {
      // Validate each component
      spec.components.forEach((comp, index) => {
        if (!comp.id || comp.id.trim() === "") {
          errors.push(`Component at index ${index} has no ID`);
        }
        if (!comp.name || comp.name.trim() === "") {
          errors.push(`Component at index ${index} has no name`);
        }
        if (!comp.type) {
          errors.push(`Component at index ${index} has no type`);
        }
      });
    }

    if (!spec.signals || spec.signals.length === 0) {
      warnings.push("No signals defined");
    } else {
      // Validate each signal
      spec.signals.forEach((signal, index) => {
        if (!signal.name || signal.name.trim() === "") {
          errors.push(`Signal at index ${index} has no name`);
        }
        if (signal.bitWidth <= 0) {
          errors.push(
            `Signal at index ${index} has invalid bit width: ${signal.bitWidth}`,
          );
        }
      });
    }

    if (!spec.clocks || spec.clocks.length === 0) {
      warnings.push("No clocks defined");
    } else {
      // Validate each clock
      spec.clocks.forEach((clock, index) => {
        if (!clock.name || clock.name.trim() === "") {
          errors.push(`Clock at index ${index} has no name`);
        }
        if (clock.period <= 0) {
          errors.push(
            `Clock at index ${index} has invalid period: ${clock.period}`,
          );
        }
        if (clock.dutyCycle < 0 || clock.dutyCycle > 1) {
          errors.push(
            `Clock at index ${index} has invalid duty cycle: ${clock.dutyCycle}`,
          );
        }
        if (clock.phase < 0 || clock.phase > 360) {
          errors.push(
            `Clock at index ${index} has invalid phase: ${clock.phase}`,
          );
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Parse UVM components into component nodes
   */
  private parseComponents(
    components: UVMComponentSpec[],
    parentX = 0,
    parentY = 0,
    level = 0,
  ): ComponentNode[] {
    const nodes: ComponentNode[] = [];
    const horizontalSpacing = 200;
    const verticalSpacing = 150;

    components.forEach((comp, index) => {
      // Calculate position based on hierarchy level
      const x = parentX + index * horizontalSpacing;
      const y = parentY + level * verticalSpacing;

      // Determine size based on component type
      const size = this.getComponentSize(comp.type);

      // Parse children recursively
      const children = comp.children
        ? this.parseComponents(comp.children, x, y, level + 1)
        : [];

      const node: ComponentNode = {
        id: comp.id,
        type: comp.type,
        name: comp.name,
        position: { x, y },
        size,
        children,
        properties: comp.properties || {},
      };

      nodes.push(node);
    });

    return nodes;
  }

  /**
   * Parse signal specifications into signals
   */
  private parseSignals(signalSpecs: SignalSpec[]): Signal[] {
    return signalSpecs.map((spec) => ({
      id: spec.name,
      name: spec.name,
      type: spec.type,
      color: SIGNAL_TYPE_COLORS[spec.type],
      bitWidth: spec.bitWidth,
    }));
  }

  /**
   * Parse clock specifications into clock signals
   */
  private parseClocks(clockSpecs: ClockSpec[]): ClockSignal[] {
    return clockSpecs.map((spec) => ({
      id: spec.name,
      name: spec.name,
      type: "clock" as const,
      color: SIGNAL_TYPE_COLORS.clock,
      bitWidth: 1,
      period: spec.period,
      dutyCycle: spec.dutyCycle,
      phase: spec.phase,
    }));
  }

  /**
   * Create timeline configuration based on specification
   */
  private createTimelineConfig(spec: TestbenchSpecification): TimelineConfig {
    // Calculate duration based on clocks
    let maxPeriod = 100; // default
    if (spec.clocks && spec.clocks.length > 0) {
      maxPeriod = Math.max(...spec.clocks.map((c) => c.period));
    }

    // Duration is 10x the longest clock period for visualization
    const duration = maxPeriod * 10;

    // Resolution is 1/10th of the shortest clock period
    let minPeriod = maxPeriod;
    if (spec.clocks && spec.clocks.length > 0) {
      minPeriod = Math.min(...spec.clocks.map((c) => c.period));
    }
    const resolution = minPeriod / 10;

    return {
      duration,
      resolution,
    };
  }

  /**
   * Get component size based on type
   */
  private getComponentSize(type: ComponentNode["type"]): {
    width: number;
    height: number;
  } {
    const sizes: Record<
      ComponentNode["type"],
      { width: number; height: number }
    > = {
      env: { width: 300, height: 200 },
      agent: { width: 200, height: 150 },
      driver: { width: 120, height: 80 },
      monitor: { width: 120, height: 80 },
      sequencer: { width: 120, height: 80 },
      scoreboard: { width: 150, height: 100 },
    };

    return sizes[type] || { width: 100, height: 60 };
  }
}

// Export singleton instance
export const specificationParser = new SpecificationParser();
