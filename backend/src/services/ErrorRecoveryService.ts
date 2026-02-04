/**
 * Error Recovery Service
 * Implements state persistence, retry strategies, and graceful degradation
 */

import logger from "../config/logger";
import { PipelineState } from "./PipelineOrchestrator";
import { webSocketService } from "./WebSocketService";

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
  retryableErrors: string[]; // Error message patterns that are retryable
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    "ECONNREFUSED",
    "timeout",
    "rate limit",
    "429",
    "503",
    "502",
    "504",
  ],
};

/**
 * Saved pipeline state for recovery
 */
export interface SavedPipelineState {
  projectId: string;
  generationId: string;
  timestamp: Date;
  state: PipelineState;
  lastSuccessfulAgent?: string;
}

/**
 * Error Recovery Service
 */
export class ErrorRecoveryService {
  private savedStates: Map<string, SavedPipelineState> = new Map();
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Save pipeline state for recovery
   */
  saveState(state: PipelineState): void {
    const key = `${state.projectId}:${state.generationId}`;

    const savedState: SavedPipelineState = {
      projectId: state.projectId,
      generationId: state.generationId,
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)), // Deep clone
      lastSuccessfulAgent: this.getLastSuccessfulAgent(state),
    };

    this.savedStates.set(key, savedState);

    logger.debug(`Saved pipeline state for ${key}`, {
      lastSuccessfulAgent: savedState.lastSuccessfulAgent,
      progress: state.progress,
    });
  }

  /**
   * Get saved state for recovery
   */
  getSavedState(
    projectId: string,
    generationId: string,
  ): SavedPipelineState | null {
    const key = `${projectId}:${generationId}`;
    return this.savedStates.get(key) || null;
  }

  /**
   * Clear saved state
   */
  clearSavedState(projectId: string, generationId: string): void {
    const key = `${projectId}:${generationId}`;
    this.savedStates.delete(key);
    logger.debug(`Cleared saved state for ${key}`);
  }

  /**
   * Get last successful agent from pipeline state
   */
  private getLastSuccessfulAgent(state: PipelineState): string | undefined {
    const completedExecutions = state.agentExecutions.filter(
      (exec) => exec.status === "completed",
    );

    if (completedExecutions.length === 0) {
      return undefined;
    }

    return completedExecutions[completedExecutions.length - 1].agentName;
  }

  /**
   * Execute function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: {
      projectId: string;
      agentName: string;
      operation: string;
    },
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error | null = null;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        logger.debug(
          `Executing ${context.operation} (attempt ${attempt}/${config.maxRetries})`,
          {
            projectId: context.projectId,
            agentName: context.agentName,
          },
        );

        const result = await fn();

        if (attempt > 1) {
          logger.info(
            `${context.operation} succeeded after ${attempt} attempts`,
            {
              projectId: context.projectId,
              agentName: context.agentName,
            },
          );

          // Notify via WebSocket
          webSocketService.sendAgentProgress(
            context.projectId,
            context.agentName,
            `${context.operation} succeeded after ${attempt} attempts`,
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;

        const isRetryable = this.isRetryableError(error, config);
        const isLastAttempt = attempt === config.maxRetries;

        logger.warn(
          `${context.operation} failed (attempt ${attempt}/${config.maxRetries})`,
          {
            projectId: context.projectId,
            agentName: context.agentName,
            error: error.message,
            retryable: isRetryable,
          },
        );

        if (!isRetryable || isLastAttempt) {
          logger.error(
            `${context.operation} failed permanently after ${attempt} attempts`,
            {
              projectId: context.projectId,
              agentName: context.agentName,
              error: error.message,
              stack: error.stack,
            },
          );

          throw error;
        }

        // Notify via WebSocket about retry
        webSocketService.sendAgentProgress(
          context.projectId,
          context.agentName,
          `${context.operation} failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxRetries})`,
          {
            error: error.message,
            nextRetryIn: delay,
          },
        );

        // Wait before retry with exponential backoff
        await this.sleep(delay);

        // Calculate next delay with exponential backoff
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any, config: RetryConfig): boolean {
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code?.toLowerCase() || "";

    return config.retryableErrors.some(
      (pattern) =>
        errorMessage.includes(pattern.toLowerCase()) ||
        errorCode.includes(pattern.toLowerCase()),
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle graceful degradation when LLM is unavailable
   * Returns true if template-only mode should be used
   */
  handleLLMUnavailable(
    projectId: string,
    agentName: string,
    error: any,
  ): boolean {
    logger.warn(
      `LLM unavailable for ${agentName}, attempting graceful degradation`,
      {
        projectId,
        error: error.message,
      },
    );

    // Check if error is LLM-related
    const isLLMError = this.isLLMError(error);

    if (isLLMError) {
      logger.info(`Switching to template-only mode for ${agentName}`, {
        projectId,
      });

      // Notify via WebSocket
      webSocketService.sendError(projectId, {
        timestamp: new Date().toISOString(),
        agentName,
        severity: "warning",
        message: `LLM unavailable, using template-only generation`,
        details: error.message,
        recoverable: true,
      });

      return true; // Use template-only mode
    }

    return false; // Cannot degrade gracefully
  }

  /**
   * Check if error is LLM-related
   */
  private isLLMError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || "";
    const errorCode = error.code?.toLowerCase() || "";

    const llmErrorPatterns = [
      "openai",
      "api key",
      "authentication",
      "rate limit",
      "quota",
      "model not found",
      "invalid model",
      "llm",
      "langchain",
    ];

    return llmErrorPatterns.some(
      (pattern) =>
        errorMessage.includes(pattern) || errorCode.includes(pattern),
    );
  }

  /**
   * Log error with appropriate severity
   */
  logError(
    error: any,
    context: {
      projectId: string;
      agentName?: string;
      operation: string;
      severity?: "warning" | "error" | "critical";
    },
  ): void {
    const severity = context.severity || this.determineSeverity(error);
    const logData = {
      projectId: context.projectId,
      agentName: context.agentName,
      operation: context.operation,
      error: error.message,
      stack: error.stack,
      code: error.code,
    };

    switch (severity) {
      case "critical":
        logger.critical(`CRITICAL: ${context.operation} failed`, logData);
        break;
      case "error":
        logger.error(`ERROR: ${context.operation} failed`, logData);
        break;
      case "warning":
        logger.warn(`WARNING: ${context.operation} failed`, logData);
        break;
    }
  }

  /**
   * Determine error severity based on error type
   */
  private determineSeverity(error: any): "warning" | "error" | "critical" {
    const errorMessage = error.message?.toLowerCase() || "";

    // Critical errors - system-level failures
    if (
      errorMessage.includes("database") ||
      errorMessage.includes("mongodb") ||
      errorMessage.includes("connection refused") ||
      errorMessage.includes("econnrefused")
    ) {
      return "critical";
    }

    // Errors - operation failures that should not happen
    if (
      errorMessage.includes("failed") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("not found")
    ) {
      return "error";
    }

    // Warnings - recoverable issues
    return "warning";
  }

  /**
   * Create error recommendation based on error type
   */
  createRecommendation(
    error: any,
    context: {
      projectId: string;
      agentName?: string;
      operation: string;
    },
  ): {
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    actionable: string;
  } {
    const errorMessage = error.message?.toLowerCase() || "";
    const severity = this.determineSeverity(error);

    // Database errors
    if (errorMessage.includes("database") || errorMessage.includes("mongodb")) {
      return {
        severity: "critical",
        category: "Database Connection",
        message: "Database connection failed",
        actionable:
          "Check MongoDB connection string and ensure database is running. Verify network connectivity.",
      };
    }

    // LLM errors
    if (this.isLLMError(error)) {
      return {
        severity: "warning",
        category: "LLM Service",
        message: "LLM service unavailable",
        actionable:
          "Verify OpenAI API key is valid. Check API quota and rate limits. System will use template-only generation.",
      };
    }

    // Parsing errors (check before file errors)
    if (
      errorMessage.includes("parse") ||
      errorMessage.includes("parsing") ||
      errorMessage.includes("syntax")
    ) {
      return {
        severity: "warning",
        category: "File Parsing",
        message: "Failed to parse input file",
        actionable:
          "Verify file format is correct. Check for syntax errors in RTL or specification files.",
      };
    }

    // File errors
    if (errorMessage.includes("file") || errorMessage.includes("enoent")) {
      return {
        severity: "warning",
        category: "File System",
        message: "File operation failed",
        actionable:
          "Verify file paths and permissions. Ensure upload directory exists and is writable.",
      };
    }

    // Network errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("econnreset") ||
      errorMessage.includes("etimedout")
    ) {
      return {
        severity: "warning",
        category: "Network",
        message: "Network operation timed out",
        actionable:
          "Check network connectivity. Retry the operation. If problem persists, check firewall settings.",
      };
    }

    // Generic error
    return {
      severity: severity === "critical" ? "critical" : "warning",
      category: "General",
      message: `${context.operation} failed`,
      actionable: `Review error details and retry. Contact support if issue persists. Error: ${error.message}`,
    };
  }

  /**
   * Get all saved states (for debugging/monitoring)
   */
  getAllSavedStates(): SavedPipelineState[] {
    return Array.from(this.savedStates.values());
  }

  /**
   * Clear all saved states
   */
  clearAllSavedStates(): void {
    this.savedStates.clear();
    logger.info("Cleared all saved pipeline states");
  }

  /**
   * Get retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    logger.info("Updated retry configuration", this.retryConfig);
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;
