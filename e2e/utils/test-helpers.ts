import { Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";

/**
 * Test helper utilities for E2E tests
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for API response with timeout
   */
  async waitForApiResponse(urlPattern: string | RegExp, timeout = 30000) {
    return this.page.waitForResponse(
      (response) => {
        const url = response.url();
        if (typeof urlPattern === "string") {
          return url.includes(urlPattern);
        }
        return urlPattern.test(url);
      },
      { timeout },
    );
  }

  /**
   * Wait for WebSocket message
   */
  async waitForWebSocketMessage(
    messageType: string,
    timeout = 60000,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(
          new Error(`Timeout waiting for WebSocket message: ${messageType}`),
        );
      }, timeout);

      this.page.on("websocket", (ws) => {
        ws.on("framereceived", (event) => {
          try {
            const data = JSON.parse(event.payload as string);
            if (data.type === messageType) {
              clearTimeout(timeoutId);
              resolve(data);
            }
          } catch (e) {
            // Ignore parse errors
          }
        });
      });
    });
  }

  /**
   * Upload file to the application
   */
  async uploadFile(fileInputSelector: string, filePath: string): Promise<void> {
    const fileChooserPromise = this.page.waitForEvent("filechooser");
    await this.page.click(fileInputSelector);
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout = 10000) {
    await this.page.waitForSelector(selector, { state: "visible", timeout });
  }

  /**
   * Get text content of element
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.page.waitForSelector(selector);
    return (await element?.textContent()) || "";
  }

  /**
   * Click and wait for navigation
   */
  async clickAndWaitForNavigation(selector: string) {
    await Promise.all([
      this.page.waitForNavigation(),
      this.page.click(selector),
    ]);
  }

  /**
   * Wait for download to complete
   */
  async waitForDownload(triggerSelector: string) {
    const downloadPromise = this.page.waitForEvent("download");
    await this.page.click(triggerSelector);
    const download = await downloadPromise;
    return download;
  }

  /**
   * Get fixture file path
   */
  getFixturePath(filename: string): string {
    return path.join(__dirname, "..", "fixtures", filename);
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  /**
   * Read file content
   */
  readFile(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
  }

  /**
   * Wait for progress to complete
   */
  async waitForProgressComplete(timeout = 300000) {
    // Wait for completion message or final status
    await this.page.waitForSelector(
      '[data-testid="generation-complete"], [data-testid="generation-status"][data-status="completed"]',
      { timeout },
    );
  }

  /**
   * Get all progress updates
   */
  async getProgressUpdates(): Promise<string[]> {
    const updates = await this.page.$$eval(
      '[data-testid="progress-update"]',
      (elements) => elements.map((el) => el.textContent || ""),
    );
    return updates;
  }

  /**
   * Check if element contains text
   */
  async elementContainsText(selector: string, text: string): Promise<boolean> {
    const content = await this.getTextContent(selector);
    return content.includes(text);
  }

  /**
   * Get attribute value
   */
  async getAttribute(
    selector: string,
    attribute: string,
  ): Promise<string | null> {
    const element = await this.page.waitForSelector(selector);
    return element?.getAttribute(attribute);
  }

  /**
   * Wait for API call to complete
   */
  async waitForApiCall(method: string, urlPattern: string | RegExp) {
    return this.page.waitForResponse((response) => {
      const matchesUrl =
        typeof urlPattern === "string"
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
      return response.request().method() === method && matchesUrl;
    });
  }
}

/**
 * Database cleanup utilities
 */
export class DatabaseHelpers {
  /**
   * Clean up test database
   */
  static async cleanupTestDatabase() {
    // This would connect to the test database and clean up
    // For now, we'll implement a simple API call approach
    const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";

    try {
      const response = await fetch(`${baseUrl}/api/test/cleanup`, {
        method: "POST",
      });

      if (!response.ok) {
        console.warn("Failed to cleanup test database");
      }
    } catch (error) {
      console.warn("Error cleaning up test database:", error);
    }
  }

  /**
   * Create test project via API
   */
  static async createTestProject(name: string, description?: string) {
    const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, description }),
    });

    if (!response.ok) {
      throw new Error("Failed to create test project");
    }

    return response.json();
  }

  /**
   * Delete test project via API
   */
  static async deleteTestProject(projectId: string) {
    const baseUrl = process.env.E2E_BASE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete test project");
    }

    return response.json();
  }
}
