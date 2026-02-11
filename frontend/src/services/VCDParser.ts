/**
 * VCD (Value Change Dump) Parser
 * Parses VCD files from simulation tools and converts to waveform data
 */

import {
  VCDData,
  VCDHeader,
  VCDSignal,
  VCDValueChange,
  VCDValidationResult,
  VCDParseError,
  VCDParseProgress,
} from "../types/vcd";
import { SignalTimeSeries, Transition } from "../types/simulation";

/**
 * VCDParser class for parsing VCD files
 */
export class VCDParser {
  private currentLine: number = 0;
  private errors: VCDParseError[] = [];
  private warnings: VCDParseError[] = [];
  private progressCallback?: (progress: VCDParseProgress) => void;

  /**
   * Set progress callback for streaming parsing
   */
  setProgressCallback(callback: (progress: VCDParseProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Parse VCD file content
   */
  parse(vcdContent: string): VCDData {
    this.reset();

    // Validate content is not empty
    if (!vcdContent || vcdContent.trim().length === 0) {
      this.addError(
        1,
        "VCD file is empty",
        "Empty file cannot be parsed. Ensure the VCD file contains valid simulation data.",
      );
      throw new Error("VCD file is empty");
    }

    const lines = vcdContent.split("\n");

    // Parse header
    const header = this.parseHeader(lines);

    // Parse signal definitions
    const signals = this.parseSignalDefinitions(lines);

    // Validate we have signals
    if (signals.size === 0) {
      this.addWarning(
        this.currentLine,
        "No signal definitions found",
        "VCD file should contain at least one $var declaration. Check that the file includes a proper definitions section.",
      );
    }

    // Parse value changes
    const valueChanges = this.parseValueChanges(lines);

    // Calculate time range
    const timeRange = this.calculateTimeRange(valueChanges);

    // Throw if we have errors
    if (this.errors.length > 0) {
      throw new Error(`VCD parsing failed with ${this.errors.length} error(s)`);
    }

    return {
      header,
      signals,
      valueChanges,
      timeRange,
    };
  }

  /**
   * Parse VCD file in streaming mode for large files
   */
  async parseStream(stream: ReadableStream<string>): Promise<VCDData> {
    this.reset();

    // Accumulate chunks with progress reporting
    const chunks: string[] = [];
    const reader = stream.getReader();
    let totalBytes = 0;
    let bytesProcessed = 0;

    try {
      // Report initial progress
      this.reportProgress("header", 0, bytesProcessed, totalBytes);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        bytesProcessed += value.length;

        // Estimate total bytes (rough estimate based on first chunk)
        if (totalBytes === 0 && chunks.length === 1) {
          totalBytes = value.length * 100; // Rough estimate
        }

        // Report progress
        const percentage =
          totalBytes > 0 ? (bytesProcessed / totalBytes) * 100 : 0;
        this.reportProgress(
          "values",
          Math.min(percentage, 99),
          bytesProcessed,
          totalBytes,
        );
      }
    } finally {
      reader.releaseLock();
    }

    // Parse accumulated content
    const content = chunks.join("");
    totalBytes = content.length;

    // Parse with progress reporting
    this.reportProgress("header", 10, totalBytes * 0.1, totalBytes);
    const lines = content.split("\n");

    const header = this.parseHeader(lines);
    this.reportProgress("definitions", 30, totalBytes * 0.3, totalBytes);

    const signals = this.parseSignalDefinitions(lines);
    this.reportProgress("values", 60, totalBytes * 0.6, totalBytes);

    const valueChanges = this.parseValueChanges(lines);
    this.reportProgress("values", 90, totalBytes * 0.9, totalBytes);

    const timeRange = this.calculateTimeRange(valueChanges);
    this.reportProgress("complete", 100, totalBytes, totalBytes);

    return {
      header,
      signals,
      valueChanges,
      timeRange,
    };
  }

  /**
   * Parse VCD file from a File object with chunked processing
   */
  async parseFile(file: File): Promise<VCDData> {
    this.reset();

    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    const totalBytes = file.size;
    let bytesProcessed = 0;
    let content = "";

    // Read file in chunks
    for (let offset = 0; offset < file.size; offset += CHUNK_SIZE) {
      const chunk = file.slice(offset, offset + CHUNK_SIZE);
      const text = await chunk.text();
      content += text;
      bytesProcessed += text.length;

      const percentage = (bytesProcessed / totalBytes) * 100;
      this.reportProgress(
        "values",
        percentage * 0.5,
        bytesProcessed,
        totalBytes,
      );
    }

    // Parse the complete content
    this.reportProgress("header", 50, totalBytes * 0.5, totalBytes);
    const lines = content.split("\n");

    const header = this.parseHeader(lines);
    this.reportProgress("definitions", 60, totalBytes * 0.6, totalBytes);

    const signals = this.parseSignalDefinitions(lines);
    this.reportProgress("values", 80, totalBytes * 0.8, totalBytes);

    const valueChanges = this.parseValueChanges(lines);
    this.reportProgress("values", 95, totalBytes * 0.95, totalBytes);

    const timeRange = this.calculateTimeRange(valueChanges);
    this.reportProgress("complete", 100, totalBytes, totalBytes);

    return {
      header,
      signals,
      valueChanges,
      timeRange,
    };
  }

  /**
   * Validate VCD format
   */
  validate(vcdContent: string): VCDValidationResult {
    this.reset();

    try {
      this.parse(vcdContent);
      return {
        isValid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error) {
      // If parse threw an error but we already have errors collected, return those
      if (this.errors.length > 0) {
        return {
          isValid: false,
          errors: this.errors,
          warnings: this.warnings,
        };
      }

      // Otherwise add the caught error
      this.errors.push({
        line: this.currentLine,
        message: error instanceof Error ? error.message : String(error),
        severity: "error",
      });
      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  /**
   * Convert VCD data to waveform format
   */
  convertToWaveform(vcdData: VCDData): Map<string, SignalTimeSeries> {
    const waveforms = new Map<string, SignalTimeSeries>();

    // Convert each signal's value changes to transitions
    vcdData.signals.forEach((signal, identifier) => {
      const valueChanges = vcdData.valueChanges.get(identifier) || [];
      const transitions: Transition[] = valueChanges.map((vc) => ({
        time: vc.time,
        value: vc.value,
      }));

      waveforms.set(signal.name, {
        signalId: signal.name,
        transitions,
      });
    });

    return waveforms;
  }

  /**
   * Parse VCD header section
   */
  private parseHeader(lines: string[]): VCDHeader {
    const header: VCDHeader = {
      date: "",
      version: "",
      timescale: { value: 1, unit: "ns" },
      comment: "",
    };

    let i = 0;
    let foundTimescale = false;

    while (i < lines.length) {
      const line = lines[i].trim();
      this.currentLine = i + 1;

      if (line.startsWith("$date")) {
        // Parse date - may span multiple lines
        let dateContent = "";
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("$end")) {
          dateContent += lines[i].trim() + " ";
          i++;
        }
        if (i >= lines.length) {
          this.addError(
            this.currentLine,
            "Unterminated $date section",
            "Add $end after the date declaration.",
          );
        }
        header.date = dateContent.trim();
      } else if (line.startsWith("$version")) {
        // Parse version - may span multiple lines
        let versionContent = "";
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("$end")) {
          versionContent += lines[i].trim() + " ";
          i++;
        }
        if (i >= lines.length) {
          this.addError(
            this.currentLine,
            "Unterminated $version section",
            "Add $end after the version declaration.",
          );
        }
        header.version = versionContent.trim();
      } else if (line.startsWith("$timescale")) {
        foundTimescale = true;
        // Parse timescale
        const timescaleMatch = line.match(/\$timescale\s+(\d+)\s*(\w+)/);
        if (timescaleMatch) {
          header.timescale = {
            value: parseInt(timescaleMatch[1], 10),
            unit: timescaleMatch[2],
          };
        } else {
          // Try next line
          i++;
          if (i < lines.length) {
            const nextLine = lines[i].trim();
            const nextMatch = nextLine.match(/(\d+)\s*(\w+)/);
            if (nextMatch) {
              header.timescale = {
                value: parseInt(nextMatch[1], 10),
                unit: nextMatch[2],
              };
            } else {
              this.addError(
                this.currentLine,
                "Invalid timescale format",
                "Expected format: $timescale <value> <unit> $end (e.g., $timescale 1ns $end)",
              );
            }
          }
        }
      } else if (line.startsWith("$comment")) {
        // Parse comment - may span multiple lines
        let commentContent = "";
        i++;
        while (i < lines.length && !lines[i].trim().startsWith("$end")) {
          commentContent += lines[i].trim() + " ";
          i++;
        }
        if (i >= lines.length) {
          this.addWarning(
            this.currentLine,
            "Unterminated $comment section",
            "Add $end after the comment.",
          );
        }
        header.comment = commentContent.trim();
      } else if (line.startsWith("$enddefinitions")) {
        // End of header section
        break;
      }

      i++;
    }

    // Warn if no timescale found
    if (!foundTimescale) {
      this.addWarning(
        1,
        "No timescale declaration found",
        "Add $timescale declaration in the header (e.g., $timescale 1ns $end). Using default: 1ns",
      );
    }

    return header;
  }

  /**
   * Parse VCD signal definitions
   */
  private parseSignalDefinitions(lines: string[]): Map<string, VCDSignal> {
    const signals = new Map<string, VCDSignal>();
    const scopeStack: string[] = [];

    let i = 0;
    let inDefinitions = false;
    let foundEnddefinitions = false;

    while (i < lines.length) {
      const line = lines[i].trim();
      this.currentLine = i + 1;

      // Start of definitions
      if (line.startsWith("$scope")) {
        inDefinitions = true;
        // Extract scope name
        const scopeMatch = line.match(/\$scope\s+\w+\s+(\w+)/);
        if (scopeMatch) {
          scopeStack.push(scopeMatch[1]);
        } else {
          this.addError(
            this.currentLine,
            "Invalid $scope declaration",
            "Expected format: $scope <type> <name> $end (e.g., $scope module testbench $end)",
          );
        }
      } else if (line.startsWith("$upscope")) {
        // Exit current scope
        if (scopeStack.length === 0) {
          this.addError(
            this.currentLine,
            "Unmatched $upscope",
            "Found $upscope without corresponding $scope. Check scope nesting.",
          );
        } else {
          scopeStack.pop();
        }
      } else if (line.startsWith("$var")) {
        // Parse variable definition
        // Format: $var <type> <size> <identifier> <name> $end
        const varMatch = line.match(
          /\$var\s+(\w+)\s+(\d+)\s+(\S+)\s+(\S+)(?:\s+\[.*\])?\s*\$end/,
        );
        if (varMatch) {
          const [, type, size, identifier, name] = varMatch;

          // Check for duplicate identifier
          if (signals.has(identifier)) {
            this.addWarning(
              this.currentLine,
              `Duplicate signal identifier '${identifier}'`,
              "Each signal must have a unique identifier code.",
            );
          }

          signals.set(identifier, {
            identifier,
            name,
            scope: [...scopeStack],
            type: type as VCDSignal["type"],
            bitWidth: parseInt(size, 10),
          });
        } else {
          this.addError(
            this.currentLine,
            `Invalid $var declaration: ${line}`,
            "Expected format: $var <type> <size> <identifier> <name> $end (e.g., $var wire 1 ! clk $end)",
          );
        }
      } else if (line.startsWith("$enddefinitions")) {
        // End of definitions section
        foundEnddefinitions = true;
        break;
      }

      i++;
    }

    // Check if we found enddefinitions (only error if we had scope definitions)
    if (inDefinitions && !foundEnddefinitions) {
      this.addError(
        this.currentLine,
        "Missing $enddefinitions",
        "VCD file must have $enddefinitions $end to mark the end of signal definitions.",
      );
    } else if (!inDefinitions && !foundEnddefinitions) {
      // No scope definitions at all, but we should still have enddefinitions
      // This is just a warning since the file might be minimal
      this.addWarning(
        this.currentLine,
        "No signal definitions section found",
        "VCD file should have $scope and $enddefinitions sections.",
      );
    }

    // Check for unmatched scopes
    if (scopeStack.length > 0) {
      this.addWarning(
        this.currentLine,
        `${scopeStack.length} unmatched $scope declaration(s)`,
        "Each $scope should have a corresponding $upscope $end.",
      );
    }

    return signals;
  }

  /**
   * Parse VCD value change dump section
   */
  private parseValueChanges(lines: string[]): Map<string, VCDValueChange[]> {
    const valueChanges = new Map<string, VCDValueChange[]>();
    let currentTime = 0;
    let foundValueChanges = false;

    // Find start of value changes (after $enddefinitions)
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim().startsWith("$enddefinitions")) {
        i++;
        break;
      }
      i++;
    }

    // Parse value changes
    while (i < lines.length) {
      const line = lines[i].trim();
      this.currentLine = i + 1;

      if (!line || line.startsWith("$")) {
        i++;
        continue;
      }

      // Check for timestamp
      if (line.startsWith("#")) {
        const timeStr = line.substring(1);
        const parsedTime = parseInt(timeStr, 10);

        if (isNaN(parsedTime)) {
          this.addError(
            this.currentLine,
            `Invalid timestamp: ${line}`,
            "Timestamps must be numeric values (e.g., #0, #10, #100)",
          );
        } else {
          currentTime = parsedTime;
          foundValueChanges = true;
        }
        i++;
        continue;
      }

      // Parse value change
      // Scalar format: <value><identifier> (e.g., "0!" or "1!")
      // Vector format: b<value> <identifier> (e.g., "b00001111 "")
      let value: string;
      let identifier: string;

      try {
        if (line.startsWith("b") || line.startsWith("B")) {
          // Vector value
          const parts = line.split(/\s+/);
          if (parts.length < 2) {
            this.addError(
              this.currentLine,
              `Invalid vector value format: ${line}`,
              'Expected format: b<binary_value> <identifier> (e.g., b00001111 ")',
            );
            i++;
            continue;
          }
          value = parts[0].substring(1); // Remove 'b' prefix
          identifier = parts[1];
        } else if (line.startsWith("r") || line.startsWith("R")) {
          // Real value
          const parts = line.split(/\s+/);
          if (parts.length < 2) {
            this.addError(
              this.currentLine,
              `Invalid real value format: ${line}`,
              "Expected format: r<real_value> <identifier>",
            );
            i++;
            continue;
          }
          value = parts[0].substring(1); // Remove 'r' prefix
          identifier = parts[1];
        } else {
          // Scalar value
          if (line.length < 2) {
            this.addError(
              this.currentLine,
              `Invalid scalar value format: ${line}`,
              "Expected format: <value><identifier> (e.g., 0!, 1!, x!, z!)",
            );
            i++;
            continue;
          }
          value = line.charAt(0);
          identifier = line.substring(1);

          // Validate scalar value
          if (!/^[01xzXZ]$/.test(value)) {
            this.addWarning(
              this.currentLine,
              `Unexpected scalar value '${value}'`,
              "Scalar values should be 0, 1, x, or z",
            );
          }
        }

        // Add value change
        if (!valueChanges.has(identifier)) {
          valueChanges.set(identifier, []);
        }
        valueChanges.get(identifier)!.push({
          time: currentTime,
          value,
        });
      } catch (error) {
        this.addError(
          this.currentLine,
          `Failed to parse value change: ${line}`,
          "Check the value change format matches VCD specification",
        );
      }

      i++;
    }

    // Warn if no value changes found
    if (!foundValueChanges) {
      this.addWarning(
        this.currentLine,
        "No value changes found in VCD file",
        "VCD file should contain timestamp markers (#<time>) and value changes after $enddefinitions",
      );
    }

    return valueChanges;
  }

  /**
   * Calculate time range from value changes
   */
  private calculateTimeRange(valueChanges: Map<string, VCDValueChange[]>): {
    start: number;
    end: number;
  } {
    let minTime = Infinity;
    let maxTime = -Infinity;

    valueChanges.forEach((changes) => {
      changes.forEach((change) => {
        minTime = Math.min(minTime, change.time);
        maxTime = Math.max(maxTime, change.time);
      });
    });

    return {
      start: minTime === Infinity ? 0 : minTime,
      end: maxTime === -Infinity ? 0 : maxTime,
    };
  }

  /**
   * Reset parser state
   */
  private reset(): void {
    this.currentLine = 0;
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Add an error with optional suggestion
   */
  private addError(line: number, message: string, suggestion?: string): void {
    this.errors.push({
      line,
      message,
      severity: "error",
      suggestion,
    });
  }

  /**
   * Add a warning with optional suggestion
   */
  private addWarning(line: number, message: string, suggestion?: string): void {
    this.warnings.push({
      line,
      message,
      severity: "warning",
      suggestion,
    });
  }

  /**
   * Report parsing progress
   */
  private reportProgress(
    phase: VCDParseProgress["phase"],
    percentage: number,
    bytesProcessed: number,
    totalBytes: number,
  ): void {
    if (this.progressCallback) {
      this.progressCallback({
        phase,
        percentage,
        bytesProcessed,
        totalBytes,
      });
    }
  }
}
