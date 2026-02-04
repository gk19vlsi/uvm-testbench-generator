import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config/env";
import logger from "../config/logger";

/**
 * Supported OpenAI models
 */
export type OpenAIModel = "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo";

/**
 * LLM Service for managing LangChain OpenAI provider
 */
export class LLMService {
  private currentModel: OpenAIModel = "gpt-4";
  private llmInstance: ChatOpenAI | null = null;

  constructor() {
    // Initialize with default model
    this.initializeLLM(this.currentModel);
  }

  /**
   * Initialize LangChain OpenAI provider with specified model
   */
  private initializeLLM(model: OpenAIModel): void {
    try {
      this.llmInstance = new ChatOpenAI({
        modelName: model,
        openAIApiKey: env.openaiApiKey,
        temperature: 0.7,
        maxTokens: 4096,
        timeout: 60000, // 60 seconds
      });

      logger.info(`LLM initialized with model: ${model}`);
    } catch (error) {
      logger.error(`Failed to initialize LLM with model ${model}:`, error);
      throw error;
    }
  }

  /**
   * Get the current LLM instance
   */
  public getLLM(): ChatOpenAI {
    if (!this.llmInstance) {
      throw new Error("LLM not initialized");
    }
    return this.llmInstance;
  }

  /**
   * Get the current model name
   */
  public getCurrentModel(): OpenAIModel {
    return this.currentModel;
  }

  /**
   * Switch to a different OpenAI model
   */
  public switchModel(model: OpenAIModel): void {
    if (model === this.currentModel) {
      logger.info(`Already using model: ${model}`);
      return;
    }

    logger.info(`Switching LLM model from ${this.currentModel} to ${model}`);
    this.currentModel = model;
    this.initializeLLM(model);
  }

  /**
   * Validate OpenAI API key by making a test request
   */
  public async validateApiKey(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      if (!env.openaiApiKey) {
        return {
          valid: false,
          error: "OpenAI API key not configured",
        };
      }

      const llm = this.getLLM();

      // Make a minimal test request
      const response = await llm.invoke("Hello");

      if (response && response.content) {
        logger.info("OpenAI API key validation successful");
        return { valid: true };
      }

      return {
        valid: false,
        error: "Invalid response from OpenAI API",
      };
    } catch (error: any) {
      logger.error("OpenAI API key validation failed:", error);

      let errorMessage = "Failed to validate API key";
      if (error.message) {
        errorMessage = error.message;
      }

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get available OpenAI models
   */
  public getAvailableModels(): OpenAIModel[] {
    return ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"];
  }

  /**
   * Check if API key is configured
   */
  public isApiKeyConfigured(): boolean {
    return !!env.openaiApiKey;
  }
}

// Export singleton instance
export const llmService = new LLMService();
