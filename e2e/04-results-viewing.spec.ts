import { test, expect } from "@playwright/test";
import { TestHelpers, DatabaseHelpers } from "./utils/test-helpers";

test.describe("Results Viewing Workflow", () => {
  let helpers: TestHelpers;
  let projectId: string;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await DatabaseHelpers.cleanupTestDatabase();

    // Create test project with completed generation
    const project = await DatabaseHelpers.createTestProject(
      "Test Results Project",
    );
    projectId = project.projectId;

    // Navigate to project page
    await page.goto(`/projects/${projectId}`);
  });

  test.afterEach(async () => {
    await DatabaseHelpers.cleanupTestDatabase();
  });

  test("should display UVM tree after generation", async ({ page }) => {
    // Assuming generation is complete, navigate to results
    await page.goto(`/projects/${projectId}`);

    // Wait for results to load
    await page.waitForSelector('[data-testid="uvm-tree"]', { timeout: 10000 });

    // Verify UVM tree is visible
    await expect(page.locator('[data-testid="uvm-tree"]')).toBeVisible();
  });

  test("should expand and collapse tree nodes", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Find first expandable node
    const expandButton = page
      .locator('[data-testid="tree-node-expand"]')
      .first();

    if (await expandButton.isVisible()) {
      // Expand node
      await expandButton.click();

      // Verify children are visible
      await expect(
        page.locator('[data-testid="tree-node-child"]').first(),
      ).toBeVisible();

      // Collapse node
      await expandButton.click();

      // Verify children are hidden
      await expect(
        page.locator('[data-testid="tree-node-child"]').first(),
      ).not.toBeVisible();
    }
  });

  test("should display component details on selection", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="uvm-tree"]');

    // Click on a tree node
    const treeNode = page.locator('[data-testid="tree-node"]').first();
    await treeNode.click();

    // Verify component details panel is visible
    await expect(
      page.locator('[data-testid="component-details"]'),
    ).toBeVisible();

    // Verify code is displayed
    await expect(page.locator('[data-testid="component-code"]')).toBeVisible();
  });

  test("should display traceability matrix", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for traceability matrix
    await page.waitForSelector('[data-testid="traceability-matrix"]', {
      timeout: 10000,
    });

    // Verify matrix is visible
    await expect(
      page.locator('[data-testid="traceability-matrix"]'),
    ).toBeVisible();

    // Verify matrix has rows and columns
    const matrixRows = await page.$$('[data-testid="matrix-row"]');
    expect(matrixRows.length).toBeGreaterThan(0);
  });

  test("should highlight coverage in traceability matrix", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="traceability-matrix"]');

    // Find covered and uncovered cells
    const coveredCells = await page.$$(
      '[data-testid="matrix-cell"][data-covered="true"]',
    );
    const uncoveredCells = await page.$$(
      '[data-testid="matrix-cell"][data-covered="false"]',
    );

    // Verify cells have different styling
    if (coveredCells.length > 0 && uncoveredCells.length > 0) {
      const coveredStyle = await coveredCells[0].evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );
      const uncoveredStyle = await uncoveredCells[0].evaluate(
        (el) => window.getComputedStyle(el).backgroundColor,
      );

      expect(coveredStyle).not.toBe(uncoveredStyle);
    }
  });

  test("should display coverage percentage", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="traceability-matrix"]');

    // Verify coverage percentage is displayed
    await expect(
      page.locator('[data-testid="coverage-percentage"]'),
    ).toBeVisible();

    // Verify it's a valid percentage
    const coverageText = await page
      .locator('[data-testid="coverage-percentage"]')
      .textContent();
    expect(coverageText).toMatch(/\d+%/);
  });

  test("should display readiness score", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);

    // Wait for readiness score
    await page.waitForSelector('[data-testid="readiness-score"]', {
      timeout: 10000,
    });

    // Verify score is displayed
    await expect(page.locator('[data-testid="readiness-score"]')).toBeVisible();

    // Verify score is a number between 0 and 100
    const scoreText = await page
      .locator('[data-testid="readiness-score"]')
      .textContent();
    const score = parseInt(scoreText || "0");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test("should display readiness classification", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="readiness-score"]');

    // Verify classification is displayed
    await expect(
      page.locator('[data-testid="readiness-classification"]'),
    ).toBeVisible();

    // Verify it's one of the valid classifications
    const classification = await page
      .locator('[data-testid="readiness-classification"]')
      .textContent();
    expect(["Not Ready", "Needs Review", "Ready"]).toContain(classification);
  });

  test("should display score breakdown", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="readiness-score"]');

    // Verify breakdown is displayed
    await expect(page.locator('[data-testid="score-breakdown"]')).toBeVisible();

    // Verify all breakdown categories are present
    await expect(
      page.locator('[data-testid="completeness-score"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="connectivity-score"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="syntax-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="coverage-score"]')).toBeVisible();
  });

  test("should display recommendations", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="readiness-score"]');

    // Check if recommendations are displayed
    const recommendations = page.locator('[data-testid="recommendations"]');

    if (await recommendations.isVisible()) {
      // Verify recommendation items
      const recommendationItems = await page.$$(
        '[data-testid="recommendation-item"]',
      );
      expect(recommendationItems.length).toBeGreaterThan(0);

      // Verify severity indicators
      await expect(
        page.locator('[data-testid="recommendation-severity"]').first(),
      ).toBeVisible();
    }
  });

  test("should filter recommendations by severity", async ({ page }) => {
    await page.goto(`/projects/${projectId}`);
    await page.waitForSelector('[data-testid="recommendations"]');

    // Click on severity filter
    await page.click('[data-testid="filter-critical"]');

    // Verify only critical recommendations are shown
    const visibleRecommendations = await page.$$(
      '[data-testid="recommendation-item"]:visible',
    );

    for (const rec of visibleRecommendations) {
      const severity = await rec.getAttribute("data-severity");
      expect(severity).toBe("critical");
    }
  });
});
