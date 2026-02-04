import { ChatOpenAI } from "@langchain/openai";
import logger from "../config/logger";
import { errorRecoveryService } from "../services/ErrorRecoveryService";

/**
 * Progress callback function type
 */
export type ProgressCallback = (update: ProgressUpdate) => void;

/**
 * Progress update structure
 */
export interface ProgressUpdate {
  timestamp: Date;
  agentName: string;
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
  details?: Record<string, any>;
}

/**
 * Base input for all agents
 */
export interface AgentInput {
  projectId: string;
  previousAgentOutput?: any;
  llmProvider: ChatOpenAI;
}

/**
 * Base output for all agents
 */
export interface AgentOutput {
  success: boolean;
  data: any;
  error?: string;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
  };
}

/**
 * Base Agent class that all specialized agents extend
 */
export abstract class BaseAgent {
  protected name: string;
  protected progressCallback?: ProgressCallback;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set progress callback for real-time updates
   */
  public onProgress(callback: ProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * Send progress update
   */
  protected sendProgress(
    status: "started" | "in_progress" | "completed" | "failed",
    message: string,
    details?: Record<string, any>,
  ): void {
    const update: ProgressUpdate = {
      timestamp: new Date(),
      agentName: this.name,
      status,
      message,
      details,
    };

    logger.info(`[${this.name}] ${status}: ${message}`, details);

    if (this.progressCallback) {
      this.progressCallback(update);
    }
  }

  /**
   * Execute the agent's main logic
   * Must be implemented by each specialized agent
   */
  public abstract execute(input: AgentInput): Promise<AgentOutput>;

  /**
   * Validate input before execution
   * Can be overridden by specialized agents
   */
  protected validateInput(input: AgentInput): void {
    if (!input.projectId) {
      throw new Error("Project ID is required");
    }
    if (!input.llmProvider) {
      throw new Error("LLM provider is required");
    }
  }

  /**
   * Parse JSON response from LLM
   */
  protected parseJsonResponse(response: string): any {
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Try to extract JSON from plain code blocks
      const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        return JSON.parse(codeMatch[1]);
      }

      // Try to parse the entire response as JSON
      return JSON.parse(response);
    } catch (error) {
      logger.error(`Failed to parse JSON response from ${this.name}:`, error);
      throw new Error(`Invalid JSON response from LLM: ${error}`);
    }
  }

  /**
   * Invoke LLM with retry logic and graceful degradation
   */
  protected async invokeLLM(
    llm: ChatOpenAI,
    prompt: string,
    maxRetries: number = 3,
    projectId?: string,
  ): Promise<string> {
    const context = {
      projectId: projectId || "unknown",
      agentName: this.name,
      operation: "LLM invocation",
    };

    try {
      return await errorRecoveryService.executeWithRetry(
        async () => {
          const response = await llm.invoke(prompt);

          if (response && response.content) {
            return String(response.content);
          }

          throw new Error("Empty response from LLM");
        },
        context,
        { maxRetries },
      );
    } catch (error: any) {
      // Check if we should use template-only mode
      const useTemplateOnly = errorRecoveryService.handleLLMUnavailable(
        context.projectId,
        this.name,
        error,
      );

      if (useTemplateOnly) {
        // Return empty string to signal template-only mode
        // Agents should handle this gracefully
        logger.warn(
          `${this.name} will use template-only mode due to LLM unavailability`,
        );
        return "";
      }

      // Log error with appropriate severity
      errorRecoveryService.logError(error, context);

      throw error;
    }
  }

  /**
   * Create agent output with execution metadata
   */
  protected createOutput(
    success: boolean,
    data: any,
    startTime: number,
    error?: string,
  ): AgentOutput {
    const executionTime = Date.now() - startTime;

    return {
      success,
      data,
      error,
      metadata: {
        executionTime,
      },
    };
  }
}
