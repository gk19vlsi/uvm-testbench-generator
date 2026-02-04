/**
 * RTL file parser
 * Extracts module definitions, ports, interfaces, and parameters from SystemVerilog/Verilog files
 */

import fs from "fs/promises";
import logger from "../config/logger";

export interface Port {
  name: string;
  direction: "input" | "output" | "inout";
  type: string;
  width?: string;
}

export interface Parameter {
  name: string;
  type?: string;
  defaultValue?: string;
}

export interface ModuleDefinition {
  name: string;
  ports: Port[];
  parameters: Parameter[];
  interfaces: string[];
  instantiations: ModuleInstantiation[];
}

export interface ModuleInstantiation {
  moduleName: string;
  instanceName: string;
  parameters?: { [key: string]: string };
}

export interface RTLParseResult {
  success: boolean;
  modules?: ModuleDefinition[];
  error?: string;
  warnings?: string[];
}

export class RTLParser {
  /**
   * Parse RTL file
   */
  async parse(filePath: string): Promise<RTLParseResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return this.parseContent(content);
    } catch (error: any) {
      logger.error(`Failed to read RTL file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse RTL content
   */
  parseContent(content: string): RTLParseResult {
    try {
      const modules: ModuleDefinition[] = [];
      const warnings: string[] = [];

      // Remove comments
      const cleanContent = this.removeComments(content);

      // Extract module definitions
      const moduleMatches = cleanContent.matchAll(
        /module\s+(\w+)\s*(?:#\s*\(([\s\S]*?)\))?\s*\(([\s\S]*?)\);([\s\S]*?)endmodule/gi,
      );

      for (const match of moduleMatches) {
        const moduleName = match[1];
        const parameterSection = match[2] || "";
        const portSection = match[3] || "";
        const bodySection = match[4] || "";

        const module: ModuleDefinition = {
          name: moduleName,
          ports: this.extractPorts(portSection, bodySection),
          parameters: this.extractParameters(parameterSection),
          interfaces: this.extractInterfaces(bodySection),
          instantiations: this.extractInstantiations(bodySection),
        };

        modules.push(module);
        logger.debug(`Parsed module: ${moduleName}`);
      }

      if (modules.length === 0) {
        warnings.push("No module definitions found in file");
      }

      return {
        success: true,
        modules,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error: any) {
      logger.error("Failed to parse RTL content:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Remove comments from RTL code
   */
  private removeComments(content: string): string {
    // Remove single-line comments
    let cleaned = content.replace(/\/\/.*$/gm, "");

    // Remove multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

    return cleaned;
  }

  /**
   * Extract ports from module definition
   */
  private extractPorts(portSection: string, bodySection: string): Port[] {
    const ports: Port[] = [];

    // Parse ANSI-style port declarations (in port list)
    const ansiPortRegex =
      /(input|output|inout)\s+(?:(wire|reg|logic)\s+)?(?:\[([^\]]+)\]\s+)?(\w+)/gi;

    let match;
    while ((match = ansiPortRegex.exec(portSection)) !== null) {
      ports.push({
        name: match[4],
        direction: match[1].toLowerCase() as "input" | "output" | "inout",
        type: match[2] || "wire",
        width: match[3],
      });
    }

    // Parse non-ANSI style (ports in body)
    if (ports.length === 0) {
      // Extract port names from port list
      const portNames = portSection
        .split(",")
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      // Find declarations in body
      for (const portName of portNames) {
        const declRegex = new RegExp(
          `(input|output|inout)\\s+(?:(wire|reg|logic)\\s+)?(?:\\[([^\\]]+)\\]\\s+)?${portName}\\b`,
          "i",
        );
        const declMatch = bodySection.match(declRegex);

        if (declMatch) {
          ports.push({
            name: portName,
            direction: declMatch[1].toLowerCase() as
              | "input"
              | "output"
              | "inout",
            type: declMatch[2] || "wire",
            width: declMatch[3],
          });
        }
      }
    }

    return ports;
  }

  /**
   * Extract parameters from module definition
   */
  private extractParameters(parameterSection: string): Parameter[] {
    const parameters: Parameter[] = [];

    if (!parameterSection) return parameters;

    // Parse parameter declarations
    const paramRegex =
      /(?:parameter|localparam)\s+(?:(\w+)\s+)?(\w+)\s*=\s*([^,\)]+)/gi;

    let match;
    while ((match = paramRegex.exec(parameterSection)) !== null) {
      parameters.push({
        name: match[2],
        type: match[1],
        defaultValue: match[3].trim(),
      });
    }

    return parameters;
  }

  /**
   * Extract interface declarations
   */
  private extractInterfaces(bodySection: string): string[] {
    const interfaces: string[] = [];

    // Look for interface instantiations
    const interfaceRegex = /(\w+_if)\s+(\w+)/gi;

    let match;
    while ((match = interfaceRegex.exec(bodySection)) !== null) {
      if (!interfaces.includes(match[1])) {
        interfaces.push(match[1]);
      }
    }

    return interfaces;
  }

  /**
   * Extract module instantiations
   */
  private extractInstantiations(bodySection: string): ModuleInstantiation[] {
    const instantiations: ModuleInstantiation[] = [];

    // Match module instantiations
    const instRegex =
      /(\w+)\s+(?:#\s*\(([\s\S]*?)\))?\s*(\w+)\s*\(([\s\S]*?)\);/gi;

    let match;
    while ((match = instRegex.exec(bodySection)) !== null) {
      const moduleName = match[1];
      const paramSection = match[2];
      const instanceName = match[3];

      // Skip if it looks like a port declaration
      if (
        ["input", "output", "inout", "wire", "reg", "logic"].includes(
          moduleName.toLowerCase(),
        )
      ) {
        continue;
      }

      const inst: ModuleInstantiation = {
        moduleName,
        instanceName,
      };

      // Parse parameters if present
      if (paramSection) {
        inst.parameters = this.parseInstantiationParameters(paramSection);
      }

      instantiations.push(inst);
    }

    return instantiations;
  }

  /**
   * Parse instantiation parameters
   */
  private parseInstantiationParameters(paramSection: string): {
    [key: string]: string;
  } {
    const params: { [key: string]: string } = {};

    // Parse .PARAM(value) style
    const paramRegex = /\.(\w+)\s*\(([^)]+)\)/gi;

    let match;
    while ((match = paramRegex.exec(paramSection)) !== null) {
      params[match[1]] = match[2].trim();
    }

    return params;
  }

  /**
   * Parse multiple RTL files
   */
  async parseMultiple(filePaths: string[]): Promise<RTLParseResult[]> {
    const results: RTLParseResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.parse(filePath);
      results.push(result);
    }

    return results;
  }

  /**
   * Build module hierarchy from parse results
   */
  buildHierarchy(results: RTLParseResult[]): Map<string, string[]> {
    const hierarchy = new Map<string, string[]>();

    // Collect all modules
    const allModules = new Map<string, ModuleDefinition>();
    for (const result of results) {
      if (result.success && result.modules) {
        for (const module of result.modules) {
          allModules.set(module.name, module);
        }
      }
    }

    // Build hierarchy based on instantiations
    for (const [moduleName, module] of allModules) {
      const children: string[] = [];

      for (const inst of module.instantiations) {
        if (allModules.has(inst.moduleName)) {
          children.push(inst.moduleName);
        }
      }

      hierarchy.set(moduleName, children);
    }

    return hierarchy;
  }

  /**
   * Classify signals as clock or reset
   */
  classifySignals(module: ModuleDefinition): {
    clocks: string[];
    resets: string[];
  } {
    const clocks: string[] = [];
    const resets: string[] = [];

    const clockPatterns = /^(clk|clock|ck|clkin|clk_)/i;
    const resetPatterns = /^(rst|reset|rstn|rst_n|arst|srst)/i;

    for (const port of module.ports) {
      if (clockPatterns.test(port.name)) {
        clocks.push(port.name);
      }
      if (resetPatterns.test(port.name)) {
        resets.push(port.name);
      }
    }

    return { clocks, resets };
  }
}

// Export singleton instance
export const rtlParser = new RTLParser();
export default rtlParser;
