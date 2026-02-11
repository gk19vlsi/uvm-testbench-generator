/**
 * VCD (Value Change Dump) Parser Types
 * Types for parsing and representing VCD file data
 */

/**
 * VCD header information
 */
export interface VCDHeader {
  date: string;
  version: string;
  timescale: { value: number; unit: string }; // e.g., { value: 1, unit: "ns" }
  comment: string;
}

/**
 * VCD signal definition
 */
export interface VCDSignal {
  identifier: string; // VCD identifier code (e.g., "!")
  name: string; // signal name
  scope: string[]; // hierarchical scope path
  type: "wire" | "reg" | "integer" | "real" | "parameter";
  bitWidth: number;
}

/**
 * VCD value change event
 */
export interface VCDValueChange {
  time: number; // simulation time
  value: string; // value as string (supports X, Z, binary, hex)
}

/**
 * Complete VCD data structure
 */
export interface VCDData {
  header: VCDHeader;
  signals: Map<string, VCDSignal>;
  valueChanges: Map<string, VCDValueChange[]>;
  timeRange: { start: number; end: number };
}

/**
 * VCD parsing error
 */
export interface VCDParseError {
  line: number;
  message: string;
  severity: "error" | "warning";
  suggestion?: string; // Optional suggestion for fixing the error
}

/**
 * VCD validation result
 */
export interface VCDValidationResult {
  isValid: boolean;
  errors: VCDParseError[];
  warnings: VCDParseError[];
}

/**
 * VCD parsing progress
 */
export interface VCDParseProgress {
  phase: "header" | "definitions" | "values" | "complete";
  percentage: number; // 0-100
  bytesProcessed: number;
  totalBytes: number;
}
