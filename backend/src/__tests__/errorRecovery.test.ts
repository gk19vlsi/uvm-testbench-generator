/**
 * Error Recovery Service Tests
 */

import { ErrorRecoveryService } from "../services/ErrorRecoveryService";
import { PipelineState } from "../services/PipelineOrchestrator";

describe("ErrorRecoveryService", () => {
  let errorRecoveryService: ErrorRecoveryService;

  beforeEach(() => {
    errorRecoveryService = new ErrorRecoveryService();
  });

  afterEach(() => {
    errorRecoveryService.clearAllSavedStates();
  });

  describe("State Persistence", () => {
    it("should save and retrieve pipeline state", () => {
      const state: PipelineState = {
        projectId: "test-project",
        generationId: "test-generation",
        status: "in_progress",
        progress: 50,
        agentExecutions: [
          {
            agentName: "Specification Agent",
            startedAt: new Date(),
            completedAt: new Date(),
            status: "completed",
            executionTime: 1000,
          },
        ],
        outputs: {
          specificationAgent: { data: "test" },
        },
      };

      errorRecoveryService.saveState(state);

      const retrieved = errorRecoveryService.getSavedState(
        "test-project",
        "test-generation",
      );

      expect(retrieved).toBeDefined();
      expect(retrieved?.projectId).toBe("test-project");
      expect(retrieved?.generationId).toBe("test-generation");
      expect(retrieved?.lastSuccessfulAgent).toBe("Specification Agent");
    });

    it("should return null for non-existent state", () => {
      const retrieved = errorRecoveryService.getSavedState(
        "non-existent",
        "non-existent",
      );

      expect(retrieved).toBeNull();
    });

    it("should clear saved state", () => {
      const state: PipelineState = {
        projectId: "test-project",
        generationId: "test-generation",
        status: "in_progress",
        progress: 50,
        agentExecutions: [],
        outputs: {},
      };

      errorRecoveryService.saveState(state);
      errorRecoveryService.clearSavedState("test-project", "test-generation");

      const retrieved = errorRecoveryService.getSavedState(
        "test-project",
        "test-generation",
      );

      expect(retrieved).toBeNull();
    });
  });

  describe("Retry Logic", () => {
    it("should execute function successfully on first attempt", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");

      const result = await errorRecoveryService.executeWithRetry(mockFn, {
        projectId: "test-project",
        agentName: "Test Agent",
        operation: "Test Operation",
      });

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should retry on retryable errors", async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("ETIMEDOUT"))
        .mockResolvedValue("success");

      const result = await errorRecoveryService.executeWithRetry(
        mockFn,
        {
          projectId: "test-project",
          agentName: "Test Agent",
          operation: "Test Operation",
        },
        { maxRetries: 2, initialDelay: 10 },
      );

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("ETIMEDOUT"));

      await expect(
        errorRecoveryService.executeWithRetry(
          mockFn,
          {
            projectId: "test-project",
            agentName: "Test Agent",
            operation: "Test Operation",
          },
          { maxRetries: 2, initialDelay: 10 },
        ),
      ).rejects.toThrow("ETIMEDOUT");

      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it("should not retry on non-retryable errors", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("Invalid input"));

      await expect(
        errorRecoveryService.executeWithRetry(
          mockFn,
          {
            projectId: "test-project",
            agentName: "Test Agent",
            operation: "Test Operation",
          },
          { maxRetries: 3, initialDelay: 10 },
        ),
      ).rejects.toThrow("Invalid input");

      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("LLM Error Handling", () => {
    it("should detect LLM errors", () => {
      const llmError = new Error("OpenAI API key invalid");

      const shouldDegrade = errorRecoveryService.handleLLMUnavailable(
        "test-project",
        "Test Agent",
        llmError,
      );

      expect(shouldDegrade).toBe(true);
    });

    it("should not degrade for non-LLM errors", () => {
      const nonLLMError = new Error("File not found");

      const shouldDegrade = errorRecoveryService.handleLLMUnavailable(
        "test-project",
        "Test Agent",
        nonLLMError,
      );

      expect(shouldDegrade).toBe(false);
    });
  });

  describe("Error Recommendations", () => {
    it("should create recommendation for database errors", () => {
      const dbError = new Error("MongoDB connection failed");

      const recommendation = errorRecoveryService.createRecommendation(
        dbError,
        {
          projectId: "test-project",
          agentName: "Test Agent",
          operation: "Database operation",
        },
      );

      expect(recommendation.severity).toBe("critical");
      expect(recommendation.category).toBe("Database Connection");
      expect(recommendation.actionable).toContain("MongoDB");
    });

    it("should create recommendation for LLM errors", () => {
      const llmError = new Error("OpenAI rate limit exceeded");

      const recommendation = errorRecoveryService.createRecommendation(
        llmError,
        {
          projectId: "test-project",
          agentName: "Test Agent",
          operation: "LLM invocation",
        },
      );

      expect(recommendation.severity).toBe("warning");
      expect(recommendation.category).toBe("LLM Service");
      expect(recommendation.actionable).toContain("API key");
    });

    it("should create recommendation for file errors", () => {
      const fileError = new Error("ENOENT: file not found");

      const recommendation = errorRecoveryService.createRecommendation(
        fileError,
        {
          projectId: "test-project",
          agentName: "Test Agent",
          operation: "File operation",
        },
      );

      expect(recommendation.severity).toBe("warning");
      expect(recommendation.category).toBe("File System");
      expect(recommendation.actionable).toContain("file paths");
    });

    it("should create recommendation for parsing errors", () => {
      const parseError = new Error("Failed to parse RTL file: syntax error");

      const recommendation = errorRecoveryService.createRecommendation(
        parseError,
        {
          projectId: "test-project",
          agentName: "RTL Agent",
          operation: "RTL parsing",
        },
      );

      expect(recommendation.severity).toBe("warning");
      expect(recommendation.category).toBe("File Parsing");
      expect(recommendation.actionable).toContain("syntax errors");
    });

    it("should create recommendation for network errors", () => {
      const networkError = new Error("ETIMEDOUT: connection timed out");

      const recommendation = errorRecoveryService.createRecommendation(
        networkError,
        {
          projectId: "test-project",
          agentName: "Test Agent",
          operation: "Network operation",
        },
      );

      expect(recommendation.severity).toBe("warning");
      expect(recommendation.category).toBe("Network");
      expect(recommendation.actionable).toContain("network connectivity");
    });
  });

  describe("Retry Configuration", () => {
    it("should get retry configuration", () => {
      const config = errorRecoveryService.getRetryConfig();

      expect(config.maxRetries).toBeDefined();
      expect(config.initialDelay).toBeDefined();
      expect(config.backoffMultiplier).toBeDefined();
    });

    it("should update retry configuration", () => {
      errorRecoveryService.updateRetryConfig({
        maxRetries: 5,
        initialDelay: 2000,
      });

      const config = errorRecoveryService.getRetryConfig();

      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(2000);
    });
  });
});
