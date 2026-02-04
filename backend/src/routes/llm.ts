import { Router } from "express";
import {
  saveLLMConfig,
  getLLMConfig,
  validateLLMApiKey,
} from "../controllers/llmController";

const router = Router();

/**
 * POST /api/llm/config
 * Save OpenAI model selection
 */
router.post("/config", saveLLMConfig);

/**
 * GET /api/llm/config
 * Get current model configuration
 */
router.get("/config", getLLMConfig);

/**
 * POST /api/llm/validate
 * Validate OpenAI API key
 */
router.post("/validate", validateLLMApiKey);

export default router;
