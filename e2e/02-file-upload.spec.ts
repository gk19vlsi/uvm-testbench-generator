import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";

test.describe("File Upload Workflow", () => {
  let helpers: TestHelpers;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();

    // Create test project
    const project = await DatabaseHelpers.createTestProject(
      "Test Upload Project",
    );
    projectId = project.projectId;

    // Navigate to project page
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should upload specification file", async ({ page }) => {
    const specFilePath = helpers.getFixturePath("sample-spec.md");

    // Upload specification file
    const fileInput = await page.locator('[data-testid="spec-file-input"]');
    await fileInput.setInputFiles(specFilePath);

    // Wait for upload to complete
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify file is displayed in uploaded files list
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText(
      "sample-spec.md",
    );
    await expect(page.locator('[data-testid="file-status"]')).toContainText(
      "completed",
    );
  });

  test("should upload RTL file", async ({ page }) => {
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    // Upload RTL file
    const fileInput = await page.locator('[data-testid="rtl-file-input"]');
    await fileInput.setInputFiles(rtlFilePath);

    // Wait for upload to complete
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify file is displayed
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText(
      "sample-rtl.sv",
    );
    await expect(page.locator('[data-testid="file-status"]')).toContainText(
      "completed",
    );
  });

  test("should upload multiple files", async ({ page }) => {
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");

    // Upload specification file
    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Upload RTL file
    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify both files are displayed
    const uploadedFiles = await page.$$('[data-testid="uploaded-file"]');
    expect(uploadedFiles.length).toBe(2);
  });

  test("should show upload progress", async ({ page }) => {
    const specFilePath = helpers.getFixturePath("sample-spec.md");

    // Start upload
    const fileInput = await page.locator('[data-testid="spec-file-input"]');
    await fileInput.setInputFiles(specFilePath);

    // Verify progress indicator appears
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Wait for completion
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify progress indicator disappears
    await expect(
      page.locator('[data-testid="upload-progress"]'),
    ).not.toBeVisible();
  });

  test("should remove uploaded file", async ({ page }) => {
    const specFilePath = helpers.getFixturePath("sample-spec.md");

    // Upload file
    const fileInput = await page.locator('[data-testid="spec-file-input"]');
    await fileInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify file is displayed
    await expect(page.locator('[data-testid="uploaded-file"]')).toContainText(
      "sample-spec.md",
    );

    // Click remove button
    await page.click('[data-testid="remove-file-button"]');

    // Wait for delete API call
    await helpers.waitForApiResponse("/api/projects/.*/files/.*");

    // Verify file is removed
    await expect(
      page.locator('[data-testid="uploaded-file"]'),
    ).not.toBeVisible();
  });

  test("should validate file format", async ({ page }) => {
    // Try to upload invalid file type (e.g., image)
    const invalidFilePath = helpers.getFixturePath("invalid-file.jpg");

    // Create a dummy invalid file if it doesn't exist
    if (!helpers.fileExists(invalidFilePath)) {
      // Skip this test if we can't create the file
      test.skip();
      return;
    }

    const fileInput = await page.locator('[data-testid="spec-file-input"]');
    await fileInput.setInputFiles(invalidFilePath);

    // Verify error message
    await expect(page.locator('[data-testid="upload-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="upload-error"]')).toContainText(
      "format",
    );
  });

  test("should enable generate button when files are uploaded", async ({
    page,
  }) => {
    // Initially, generate button should be disabled
    const generateButton = page.locator('[data-testid="generate-button"]');
    await expect(generateButton).toBeDisabled();

    // Upload specification file
    const specFilePath = helpers.getFixturePath("sample-spec.md");
    const specInput = await page.locator('[data-testid="spec-file-input"]');
    await specInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Upload RTL file
    const rtlFilePath = helpers.getFixturePath("sample-rtl.sv");
    const rtlInput = await page.locator('[data-testid="rtl-file-input"]');
    await rtlInput.setInputFiles(rtlFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Generate button should now be enabled
    await expect(generateButton).toBeEnabled();
  });

  test("should display file size and type", async ({ page }) => {
    const specFilePath = helpers.getFixturePath("sample-spec.md");

    // Upload file
    const fileInput = await page.locator('[data-testid="spec-file-input"]');
    await fileInput.setInputFiles(specFilePath);
    await helpers.waitForApiResponse("/api/projects/.*/files/upload");

    // Verify file metadata is displayed
    await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-type"]')).toContainText("md");
  });
});
