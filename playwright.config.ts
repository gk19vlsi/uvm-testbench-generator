import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E testing
 * Tests the complete UVM Testbench Chatbot application
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Run tests sequentially to avoid database conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to avoid database conflicts
  reporter: [
    ["html"],
    ["list"],
    ["json", { outputFile: "test-results/e2e-results.json" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Run backend and frontend servers before tests
  webServer: [
    {
      command: "cd backend && npm run dev",
      url: "http://localhost:3000/api/projects",
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: "test",
        PORT: "3000",
        MONGODB_URI:
          process.env.TEST_MONGODB_URI ||
          "mongodb+srv://gkt2work_db_user:a0T824d9ek4rA9ou@cluster0.cmae5by.mongodb.net/uvm_chatbot_test",
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
      },
    },
    {
      command: "cd frontend && npm run dev",
      url: "http://localhost:5173",
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
