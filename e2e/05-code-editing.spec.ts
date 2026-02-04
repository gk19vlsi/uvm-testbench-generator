import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";

test.describe("Code Editing Workflow", () => {
  let helpers: TestHelpers;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();

    // Create test project
    const project = await DatabaseHelpers.createTestProject(
      "Test Code Editing Project",
    );
    projectId = project.projectId;

    // Navigate to project page
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should open code editor on file selection", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for UVM tree
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Click on a file node
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Verify code editor is visible
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();
  });

  test("should display syntax highlighting", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor to load
    await page.waitForSelector('[data-testid="code-editor"]');

    // Verify Monaco editor is loaded
    await expect(page.locator(".monaco-editor")).toBeVisible();
  });

  test("should edit and save code", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Edit code (Monaco editor interaction)
    await page.click(".monaco-editor");
    await page.keyboard.type("// Test comment");

    // Save changes
    const saveButton = page.locator('[data-testid="save-code-button"]');
    await saveButton.click();

    // Wait for save API call
    await helpers.waitForApiResponse("/api/projects/.*/files/.*");

    // Verify save success message
    await expect(page.locator('[data-testid="save-success"]')).toBeVisible();
  });

  test("should display syntax errors", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Introduce syntax error
    await page.click(".monaco-editor");
    await page.keyboard.type("invalid syntax here;;;");

    // Try to save
    await page.click('[data-testid="save-code-button"]');

    // Verify error message
    await expect(page.locator('[data-testid="syntax-error"]')).toBeVisible();
  });

  test("should create new sequence", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Click create sequence button
    await page.click('[data-testid="create-sequence-button"]');

    // Fill in sequence name
    await page.fill('[data-testid="sequence-name-input"]', "custom_test_seq");

    // Select sequence type
    await page.selectOption('[data-testid="sequence-type-select"]', "directed");

    // Submit
    await page.click('[data-testid="create-sequence-submit"]');

    // Verify editor opens with template
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();

    // Verify template content
    const editorContent = await page.locator(".monaco-editor").textContent();
    expect(editorContent).toContain("class custom_test_seq");
  });

  test("should close editor without saving", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Make changes
    await page.click(".monaco-editor");
    await page.keyboard.type("// Unsaved changes");

    // Close editor
    await page.click('[data-testid="close-editor-button"]');

    // Verify confirmation dialog
    await expect(
      page.locator('[data-testid="unsaved-changes-dialog"]'),
    ).toBeVisible();

    // Confirm close without saving
    await page.click('[data-testid="discard-changes-button"]');

    // Verify editor is closed
    await expect(page.locator('[data-testid="code-editor"]')).not.toBeVisible();
  });

  test("should support keyboard shortcuts", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Focus editor
    await page.click(".monaco-editor");

    // Test Ctrl+S (save)
    await page.keyboard.press("Control+S");

    // Verify save was triggered
    await helpers.waitForApiResponse("/api/projects/.*/files/.*");
  });

  test("should show line numbers", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Verify line numbers are visible
    await expect(page.locator(".line-numbers")).toBeVisible();
  });

  test("should support find and replace", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Open a file
    const fileNode = page
      .locator('[data-testid="tree-node"][data-type="file"]')
      .first();
    await fileNode.click();

    // Wait for editor
    await page.waitForSelector('[data-testid="code-editor"]');

    // Open find dialog (Ctrl+F)
    await page.keyboard.press("Control+F");

    // Verify find dialog is visible
    await expect(page.locator(".find-widget")).toBeVisible();
  });
});
