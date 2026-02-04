/**
 * Template Engine for UVM Code Generation
 *
 * Handles template loading and placeholder replacement
 */

import fs from "fs/promises";
import path from "path";
import logger from "../config/logger";

/**
 * Load template file from templates directory
 */
export async function loadTemplate(templatePath: string): Promise<string> {
  try {
    const fullPath = path.join(__dirname, "..", "templates", templatePath);
    const content = await fs.readFile(fullPath, "utf-8");
    return content;
  } catch (error: any) {
    logger.error(`Failed to load template ${templatePath}:`, error);
    throw new Error(`Template not found: ${templatePath}`);
  }
}

/**
 * Fill template with data by replacing placeholders
 * Placeholders are in format {{PLACEHOLDER_NAME}}
 */
export function fillTemplate(
  template: string,
  data: Record<string, string>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{{${key}}}`;
    // Replace all occurrences of the placeholder
    result = result.split(placeholder).join(value);
  }

  return result;
}

/**
 * Fill template from file
 */
export async function fillTemplateFromFile(
  templatePath: string,
  data: Record<string, string>,
): Promise<string> {
  const template = await loadTemplate(templatePath);
  return fillTemplate(template, data);
}

/**
 * Convert string to uppercase for use in header guards
 */
export function toUpperSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toUpperCase()
    .replace(/^_/, "")
    .replace(/-/g, "_");
}

/**
 * Convert string to PascalCase for class names
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

/**
 * Convert string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/-/g, "_");
}

/**
 * Generate indented code block
 */
export function indent(code: string, spaces: number = 2): string {
  const indentation = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => (line.trim() ? indentation + line : line))
    .join("\n");
}

/**
 * Check if template has unfilled placeholders
 */
export function hasUnfilledPlaceholders(content: string): boolean {
  return /\{\{[A-Z_]+\}\}/.test(content);
}

/**
 * Get list of unfilled placeholders
 */
export function getUnfilledPlaceholders(content: string): string[] {
  const matches = content.match(/\{\{([A-Z_]+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches)];
}

/**
 * Remove empty placeholder sections
 * Removes lines that only contain empty placeholders
 */
export function cleanEmptyPlaceholders(content: string): string {
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      // Remove lines that are only placeholders with no content
      return !(trimmed.startsWith("{{") && trimmed.endsWith("}}"));
    })
    .join("\n");
}
