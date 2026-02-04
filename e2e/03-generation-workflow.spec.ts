import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";

test.describe("Generation Workflow", () => {
  let helpers: TestHelpers;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();

    // Create test project
    const project = await DatabaseHelpers.createTestProject(
      "Test Generation Project",
    );
    projectId = project.projectId;

    // Navigate to project page
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should start generation workflow", async ({ page }) => {
    // Upload files
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Select generation mode
    await page.selectOption('[data-testid="generation-mode-select"]', "mvp");

    // Click generate button
    const generateButton = page.locator('[data-testid="generate-button"]');
    await generateButton.click();

    // Wait for generation to start
    await helpers.waitForApiResponse("/api/projects/.*/generate");

    // Verify progress tracker is visible
    await expect(
      page.locator('[data-testid="progress-tracker"]'),
    ).toBeVisible();
  });

  test("should display real-time progress updates", async ({ page }) => {
    // Upload files
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Start generation
    await page.click('[data-testid="generate-button"]');
    await helpers.waitForApiResponse("/api/projects/.*/generate");

    // Wait for first progress update
    await page.waitForSelector('[data-testid="progress-update"]', {
      timeout: 30000,
    });

    // Verify progress updates appear
    const progressUpdates = await page.$$('[data-testid="progress-update"]');
    expect(progressUpdates.length).toBeGreaterThan(0);

    // Verify agent names are displayed
    const firstUpdate = await progressUpdates[0].textContent();
    expect(firstUpdate).toMatch(
      /Specification|RTL|Alignment|Architecture|Generator|Sequence|Validation/,
    );
  });

  test.skip("should complete generation workflow with real LLM", async ({
    page,
  }) => {
    // Skip if no OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      test.skip();
      return;
    }

    // Upload files
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Start generation
    await page.click('[data-testid="generate-button"]');
    await helpers.waitForApiResponse("/api/projects/.*/generate");

    // Wait for completion (this may take several minutes)
    await helpers.waitForProgressComplete(600000); // 10 minutes timeout

    // Verify completion message
    await expect(
      page.locator('[data-testid="generation-complete"]'),
    ).toBeVisible();

    // Verify readiness score is displayed
    await expect(page.locator('[data-testid="readiness-score"]')).toBeVisible();
  });

  test("should handle generation errors gracefully", async ({ page }) => {
    // Upload only specification file (missing RTL)
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Try to generate without RTL file
    const generateButton = page.locator('[data-testid="generate-button"]');

    // Button should be disabled
    await expect(generateButton).toBeDisabled();
  });

  test("should allow canceling generation", async ({ page }) => {
    // Upload files
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Start generation
    await page.click('[data-testid="generate-button"]');
    await helpers.waitForApiResponse("/api/projects/.*/generate");

    // Wait for progress to start
    await page.waitForSelector('[data-testid="progress-update"]');

    // Click cancel button if available
    const cancelButton = page.locator(
      '[data-testid="cancel-generation-button"]',
    );
    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // Verify generation is canceled
      await expect(
        page.locator('[data-testid="generation-status"]'),
      ).toContainText("canceled");
    }
  });

  test("should persist generation state on page reload", async ({ page }) => {
    // Upload files
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Start generation
    await page.click('[data-testid="generate-button"]');
    await helpers.waitForApiResponse("/api/projects/.*/generate");

    // Wait for some progress
    await page.waitForSelector('[data-testid="progress-update"]');

    // Reload page
    await page.reload();

    // Verify progress tracker is still visible
    await expect(
      page.locator('[data-testid="progress-tracker"]'),
    ).toBeVisible();

    // Verify progress updates are still displayed
    const progressUpdates = await page.$$('[data-testid="progress-update"]');
    expect(progressUpdates.length).toBeGreaterThan(0);
  });
});
