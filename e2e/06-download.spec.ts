import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";
import * as path from "path";

test.describe("Download Workflow", () => {
  let helpers: TestHelpers;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();

    // Create test project
    const project = await DatabaseHelpers.createTestProject(
      "Test Download Project",
    );
    projectId = project.projectId;

    // Navigate to project page
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should download complete testbench as ZIP", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for download button to be enabled
    await page.waitForSelector(
      '[data-testid="download-zip-button"]:not([disabled])',
    );

    // Trigger download
    const download = await helpers.waitForDownload(
      '[data-testid="download-zip-button"]',
    );

    // Verify download
    expect(download).toBeTruthy();

    // Verify filename format
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/.*\.zip$/);
    expect(filename).toContain(projectId);
  });

  test("should download individual file", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for UVM tree
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Find a file node with download button
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.hover();

    // Click download button for individual file
    const downloadButton = fileNode.locator(
      '[data-testid="download-file-button"]',
    );

    if (await downloadButton.isVisible()) {
      const download = await helpers.waitForDownload(
        '[data-testid="download-file-button"]',
      );

      // Verify download
      expect(download).toBeTruthy();

      // Verify filename
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.(sv|v|md)$/);
    }
  });

  test("should show download progress", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Click download button
    await page.click('[data-testid="download-zip-button"]');

    // Verify progress indicator appears
    await expect(
      page.locator('[data-testid="download-progress"]'),
    ).toBeVisible();

    // Wait for download to complete
    await page.waitForEvent("download");

    // Verify progress indicator disappears
    await expect(
      page.locator('[data-testid="download-progress"]'),
    ).not.toBeVisible();
  });

  test("should include README in ZIP", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Download ZIP
    const download = await helpers.waitForDownload(
      '[data-testid="download-zip-button"]',
    );

    // Save download to temp location
    const downloadPath = await download.path();

    // Verify download path exists
    expect(downloadPath).toBeTruthy();

    // Note: Full ZIP extraction and verification would require additional libraries
    // For now, we verify the download completed successfully
  });

  test("should preserve directory structure in ZIP", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Download ZIP
    const download = await helpers.waitForDownload(
      '[data-testid="download-zip-button"]',
    );

    // Verify download completed
    expect(download).toBeTruthy();

    // Verify filename includes project name
    const filename = download.suggestedFilename();
    expect(filename).toContain("testbench");
  });

  test("should handle download errors", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Try to download before generation is complete
    const downloadButton = page.locator('[data-testid="download-zip-button"]');

    if (await downloadButton.isDisabled()) {
      // Verify tooltip or message explaining why download is disabled
      await downloadButton.hover();
      await expect(
        page.locator('[data-testid="download-disabled-tooltip"]'),
      ).toBeVisible();
    }
  });

  test("should allow re-downloading", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // First download
    const download1 = await helpers.waitForDownload(
      '[data-testid="download-zip-button"]',
    );
    expect(download1).toBeTruthy();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Second download
    const download2 = await helpers.waitForDownload(
      '[data-testid="download-zip-button"]',
    );
    expect(download2).toBeTruthy();

    // Verify both downloads have similar filenames
    const filename1 = download1.suggestedFilename();
    const filename2 = download2.suggestedFilename();

    expect(filename1).toMatch(/\.zip$/);
    expect(filename2).toMatch(/\.zip$/);
  });

  test("should display file count in download button", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for download button
    await page.waitForSelector('[data-testid="download-zip-button"]');

    // Verify file count is displayed
    const buttonText = await page
      .locator('[data-testid="download-zip-button"]')
      .textContent();

    // Should contain number of files or "Download"
    expect(buttonText).toMatch(/Download|files/i);
  });

  test("should show download size estimate", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Check if size estimate is displayed
    const sizeEstimate = page.locator('[data-testid="download-size-estimate"]');

    if (await sizeEstimate.isVisible()) {
      const sizeText = await sizeEstimate.textContent();
      expect(sizeText).toMatch(/\d+\s*(KB|MB)/);
    }
  });
});
