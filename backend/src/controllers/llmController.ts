import { Request, Response } from "express";
import { llmService, OpenAIModel } from "../services/LLMService";
import logger from "../config/logger";
import { llmConfigurationModel } from "../models/LLMConfiguration";

/**
 * POST /api/llm/config
 * Save OpenAI model selection
 */
export async function saveLLMConfig(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { model } = req.body;

    // Validate model
    const availableModels = llmService.getAvailableModels();
    if (!model || !availableModels.includes(model)) {
      res.status(400).json({
        error: "Invalid model",
        message: `Model must be one of: ${availableModels.join(", ")}`,
      });
      return;
    }

    // Validate API key
    const validation = await llmService.validateApiKey();
    if (!validation.valid) {
      res.status(400).json({
        error: "API key validation failed",
        message: validation.error || "Invalid OpenAI API key",
      });
      return;
    }

    // Switch to the new model
    llmService.switchModel(model as OpenAIModel);

    // Save configuration to database
    const config = await llmConfigurationModel.upsert({
      provider: "openai",
      defaultModel: model,
      models: availableModels,
      validated: true,
    });

    logger.info(`LLM configuration saved: ${model}`);

    res.json({
      success: true,
      config: {
        provider: config.provider,
        defaultModel: config.defaultModel,
        models: config.models,
        validated: config.validated,
        validatedAt: config.validatedAt,
      },
    });
  } catch (error: any) {
    logger.error("Error saving LLM config:", error);
    res.status(500).json({
      error: "Failed to save LLM configuration",
      message: error.message,
    });
  }
}

/**
 * GET /api/llm/config
 * Get current model configuration
 */
export async function getLLMConfig(req: Request, res: Response): Promise<void> {
  try {
    // Get configuration from database
    const config = await llmConfigurationModel.getCurrent();

    if (!config) {
      // Return default configuration
      res.json({
        provider: "openai",
        defaultModel: llmService.getCurrentModel(),
        models: llmService.getAvailableModels(),
        validated: llmService.isApiKeyConfigured(),
        validatedAt: null,
      });
      return;
    }

    res.json({
      provider: config.provider,
      defaultModel: config.defaultModel,
      models: config.models,
      validated: config.validated,
      validatedAt: config.validatedAt,
    });
  } catch (error: any) {
    logger.error("Error getting LLM config:", error);
    res.status(500).json({
      error: "Failed to get LLM configuration",
      message: error.message,
    });
  }
}

/**
 * POST /api/llm/validate
 * Validate OpenAI API key
 */
export async function validateLLMApiKey(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const validation = await llmService.validateApiKey();

    if (validation.valid) {
      res.json({
        valid: true,
        message: "API key is valid",
      });
    } else {
      res.status(400).json({
        valid: false,
        error: validation.error || "API key validation failed",
      });
    }
  } catch (error: any) {
    logger.error("Error validating API key:", error);
    res.status(500).json({
      valid: false,
      error: "Failed to validate API key",
      message: error.message,
    });
  }
}
