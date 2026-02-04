import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";

test.describe("Project Creation Workflow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();
    await page.goto("/");
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should create a new project from dashboard", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/");

    // Click create project button
    await page.click('[data-testid="create-project-button"]');

    // Fill in project details
    await page.fill('[data-testid="project-name-input"]', "Test AXI4 Project");
    await page.fill(
      '[data-testid="project-description-input"]',
      "Test project for AXI4 slave verification",
    );

    // Submit form
    const responsePromise = helpers.waitForApiResponse("/api/projects");
    await page.click('[data-testid="create-project-submit"]');
    const response = await responsePromise;

    // Verify response
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty("projectId");
    expect(data.name).toBe("Test AXI4 Project");

    // Verify navigation to generation page
    await page.waitForURL(/\/projects\/.+/);

    // Verify project name is displayed
    await expect(page.locator('[data-testid="project-title"]')).toContainText(
      "Test AXI4 Project",
    );
  });

  test("should display validation error for empty project name", async ({
    page,
  }) => {
    await page.goto("/");

    // Click create project button
    await page.click('[data-testid="create-project-button"]');

    // Try to submit without name
    await page.click('[data-testid="create-project-submit"]');

    // Verify error message
    await expect(
      page.locator('[data-testid="project-name-error"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="project-name-error"]'),
    ).toContainText("required");
  });

  test("should list existing projects on dashboard", async ({ page }) => {
    // Create test projects via API
    const project1 = await DatabaseHelpers.createTestProject(
      "Project 1",
      "Description 1",
    );
    const project2 = await DatabaseHelpers.createTestProject(
      "Project 2",
      "Description 2",
    );

    // Navigate to dashboard
    await page.goto("/");

    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"]');

    // Verify both projects are displayed
    const projectCards = await page.$$('[data-testid="project-card"]');
    expect(projectCards.length).toBeGreaterThanOrEqual(2);

    // Verify project names
    await expect(
      page.locator(`[data-testid="project-card-${project1.projectId}"]`),
    ).toContainText("Project 1");
    await expect(
      page.locator(`[data-testid="project-card-${project2.projectId}"]`),
    ).toContainText("Project 2");
  });

  test("should delete a project", async ({ page }) => {
    // Create test project
    const project =
      await DatabaseHelpers.createTestProject("Project to Delete");

    // Navigate to dashboard
    await page.goto("/");

    // Wait for project card
    await page.waitForSelector(
      `[data-testid="project-card-${project.projectId}"]`,
    );

    // Click delete button
    await page.click(`[data-testid="delete-project-${project.projectId}"]`);

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Wait for API response
    await helpers.waitForApiResponse(`/api/projects/${project.projectId}`);

    // Verify project is removed from list
    await expect(
      page.locator(`[data-testid="project-card-${project.projectId}"]`),
    ).not.toBeVisible();
  });

  test("should navigate to project generation page", async ({ page }) => {
    // Create test project
    const project = await DatabaseHelpers.createTestProject("Test Project");

    // Navigate to dashboard
    await page.goto("/");

    // Click on project card
    await page.click(`[data-testid="project-card-${project.projectId}"]`);

    // Verify navigation
    await page.waitForURL(`/projects/${project.projectId}`);

    // Verify generation interface is displayed
    await expect(
      page.locator('[data-testid="file-upload-section"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="generation-controls"]'),
    ).toBeVisible();
  });
});
