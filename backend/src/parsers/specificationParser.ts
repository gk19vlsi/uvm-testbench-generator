/**
 * Specification file parsers
 * Extracts text from PDF, DOCX, MD, and TXT files
 */

import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import MarkdownIt from "markdown-it";
import fs from "fs/promises";
import logger from "../config/logger";

const md = new MarkdownIt();

export interface ParseResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    format?: string;
  };
}

export class SpecificationParser {
  /**
   * Parse PDF file
   */
  async parsePDF(filePath: string): Promise<ParseResult> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);

      logger.info(`Parsed PDF: ${filePath} (${data.numpages} pages)`);

      return {
        success: true,
        text: data.text,
        metadata: {
          pageCount: data.numpages,
          wordCount: data.text.split(/\s+/).length,
          format: "pdf",
        },
      };
    } catch (error: any) {
      logger.error(`Failed to parse PDF ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse DOCX file
   */
  async parseDOCX(filePath: string): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });

      logger.info(`Parsed DOCX: ${filePath}`);

      return {
        success: true,
        text: result.value,
        metadata: {
          wordCount: result.value.split(/\s+/).length,
          format: "docx",
        },
      };
    } catch (error: any) {
      logger.error(`Failed to parse DOCX ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse Markdown file
   */
  async parseMarkdown(filePath: string): Promise<ParseResult> {
    try {
      const content = await fs.readFile(filePath, "utf-8");

      // Convert markdown to plain text (strip HTML tags)
      const html = md.render(content);
      const text = html
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      logger.info(`Parsed Markdown: ${filePath}`);

      return {
        success: true,
        text,
        metadata: {
          wordCount: text.split(/\s+/).length,
          format: "markdown",
        },
      };
    } catch (error: any) {
      logger.error(`Failed to parse Markdown ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse plain text file
   */
  async parseText(filePath: string): Promise<ParseResult> {
    try {
      const text = await fs.readFile(filePath, "utf-8");

      logger.info(`Parsed text file: ${filePath}`);

      return {
        success: true,
        text,
        metadata: {
          wordCount: text.split(/\s+/).length,
          format: "text",
        },
      };
    } catch (error: any) {
      logger.error(`Failed to parse text file ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Parse specification file based on extension
   */
  async parse(filePath: string): Promise<ParseResult> {
    const ext = filePath.toLowerCase().split(".").pop();

    switch (ext) {
      case "pdf":
        return await this.parsePDF(filePath);
      case "docx":
        return await this.parseDOCX(filePath);
      case "md":
        return await this.parseMarkdown(filePath);
      case "txt":
        return await this.parseText(filePath);
      default:
        return {
          success: false,
          error: `Unsupported file format: ${ext}`,
        };
    }
  }

  /**
   * Parse multiple specification files
   */
  async parseMultiple(filePaths: string[]): Promise<ParseResult[]> {
    const results: ParseResult[] = [];

    for (const filePath of filePaths) {
      const result = await this.parse(filePath);
      results.push(result);
    }

    return results;
  }

  /**
   * Combine text from multiple parse results
   */
  combineResults(results: ParseResult[]): string {
    return results
      .filter((r) => r.success && r.text)
      .map((r) => r.text)
      .join("\n\n");
  }
}

// Export singleton instance
export const specificationParser = new SpecificationParser();
export default specificationParser;
