/**
 * Simulation Visualization Data Models
 * Core types for waveform rendering, component diagrams, and simulation state
 */

// ============================================================================
// Waveform Data Models
// ============================================================================

/**
 * Represents a signal value (can be multi-bit)
 */
export interface SignalValue {
  type: "binary" | "hex" | "decimal";
  value: string | number;
  isUnknown: boolean; // for 'X' or 'Z' states
}

/**
 * Represents a signal transition at a specific time
 */
export interface Transition {
  time: number;
  value: string | number;
}

/**
 * Time series data for a single signal
 */
export interface SignalTimeSeries {
  signalId: string;
  transitions: Transition[];
}

/**
 * Represents a complete waveform dataset
 */
export interface WaveformDataset {
  signals: Map<string, SignalTimeSeries>;
  timeRange: { start: number; end: number };
  resolution: number; // minimum time step
}

/**
 * Configuration for a signal to be displayed
 */
export interface Signal {
  id: string;
  name: string;
  type: "clock" | "data" | "control";
  color: string;
  bitWidth: number;
}

/**
 * Signal data with transitions for rendering
 */
export interface SignalData {
  signalId: string;
  transitions: Transition[];
}

/**
 * View transformation for zoom and pan
 */
export interface ViewTransform {
  offsetX: number; // horizontal pan offset
  offsetY: number; // vertical pan offset
  scaleX: number; // horizontal zoom scale
  scaleY: number; // vertical zoom scale
}

/**
 * Configuration for waveform renderer
 */
export interface WaveformConfig {
  width: number;
  height: number;
  timeScale: number; // pixels per time unit
  signalHeight: number; // height of each signal track
  backgroundColor: string;
  gridColor: string;
  showGrid: boolean;
}

// ============================================================================
// Component Models
// ============================================================================

/**
 * A node in the UVM component hierarchy
 */
export interface ComponentNode {
  id: string;
  type: "agent" | "driver" | "monitor" | "scoreboard" | "sequencer" | "env";
  name: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  children: ComponentNode[]; // for hierarchical components
  properties: Record<string, any>;
}

/**
 * An edge connecting two components
 */
export interface ComponentEdge {
  id: string;
  from: string; // component id
  to: string; // component id
  label: string;
  type: "tlm" | "analysis" | "config";
}

/**
 * Layout configuration for component graph
 */
export interface GraphLayout {
  type: "hierarchical" | "force-directed";
  direction: "top-down" | "left-right";
  spacing: { horizontal: number; vertical: number };
}

/**
 * Complete component graph structure
 */
export interface ComponentGraph {
  nodes: ComponentNode[];
  edges: ComponentEdge[];
  layout: GraphLayout;
}

/**
 * Represents the complete UVM testbench hierarchy
 */
export interface TestbenchModel {
  root: ComponentNode;
  connections: Map<string, ComponentEdge[]>;
}

/**
 * Runtime state for animated components
 */
export interface ComponentRuntimeState {
  componentId: string;
  isActive: boolean;
  currentTransaction: TransactionData | null;
  activityLevel: number; // 0.0 to 1.0 for visual feedback
}

/**
 * Transaction data for animation
 */
export interface TransactionData {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: number;
}

// ============================================================================
// Simulation State Models
// ============================================================================

/**
 * A simulation event
 */
export interface SimulationEvent {
  time: number;
  type: "transaction" | "assertion" | "error" | "phase_change";
  description: string;
  severity: "info" | "warning" | "error";
}

/**
 * Current simulation state
 */
export interface SimulationState {
  isRunning: boolean;
  currentTime: number; // simulation time in time units
  cycleCount: number;
  phase: "reset" | "stimulus" | "checking" | "complete";
  events: SimulationEvent[];
}

/**
 * Timeline event
 */
export interface TimelineEvent {
  time: number;
  type: "transaction" | "assertion" | "error" | "checkpoint";
  description: string;
  severity: "info" | "warning" | "error";
  relatedComponents: string[]; // component IDs
}

/**
 * Time marker on timeline
 */
export interface TimeMarker {
  time: number;
  label: string;
  color: string;
}

/**
 * Simulation phase
 */
export interface SimulationPhase {
  name: "reset" | "stimulus" | "checking" | "complete";
  startTime: number;
  endTime: number;
  color: string;
}

/**
 * Complete timeline structure
 */
export interface Timeline {
  events: TimelineEvent[];
  markers: TimeMarker[];
  phases: SimulationPhase[];
}

// ============================================================================
// Specification Models
// ============================================================================

/**
 * Clock specification
 */
export interface ClockSpec {
  name: string;
  period: number;
  dutyCycle: number; // 0.0 to 1.0
  phase: number; // phase offset in degrees
}

/**
 * Clock signal (extends Signal with clock-specific properties)
 */
export interface ClockSignal extends Signal {
  period: number;
  dutyCycle: number;
  phase: number;
}

/**
 * Signal specification
 */
export interface SignalSpec {
  name: string;
  type: "clock" | "data" | "control";
  bitWidth: number;
}

/**
 * UVM component specification
 */
export interface UVMComponentSpec {
  id: string;
  type: "agent" | "driver" | "monitor" | "scoreboard" | "sequencer" | "env";
  name: string;
  children?: UVMComponentSpec[];
  properties?: Record<string, any>;
}

/**
 * RTL description
 */
export interface RTLDescription {
  moduleName: string;
  ports: Array<{
    name: string;
    direction: "input" | "output" | "inout";
    width: number;
  }>;
}

/**
 * Verification plan
 */
export interface VerificationPlan {
  testCases: Array<{
    name: string;
    description: string;
  }>;
  coverageGoals: Array<{
    name: string;
    target: number;
  }>;
}

/**
 * Complete testbench specification
 */
export interface TestbenchSpecification {
  rtl: RTLDescription;
  verification: VerificationPlan;
  components: UVMComponentSpec[];
  signals: SignalSpec[];
  clocks: ClockSpec[];
}

/**
 * Timeline configuration
 */
export interface TimelineConfig {
  duration: number;
  resolution: number;
}

/**
 * Visualization data extracted from specification
 */
export interface VisualizationData {
  components: ComponentNode[];
  signals: Signal[];
  clocks: ClockSignal[];
  timeline: TimelineConfig;
}

/**
 * Specification validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Specification changes for reactive updates
 */
export interface SpecificationChanges {
  addedComponents: UVMComponentSpec[];
  removedComponents: string[]; // component IDs
  addedSignals: SignalSpec[];
  removedSignals: string[]; // signal names
  addedClocks: ClockSpec[];
  removedClocks: string[]; // clock names
}
