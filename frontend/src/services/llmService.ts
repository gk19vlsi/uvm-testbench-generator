/**
 * LLM Service
 * API functions for LLM configuration
 */

import apiClient from "./api";

export interface LLMConfiguration {
  provider: "openai";
  defaultModel: string;
  models: string[];
  validated: boolean;
  validatedAt?: string;
}

/**
 * Get LLM configuration
 */
export const getLLMConfig = async (): Promise<LLMConfiguration> => {
  const response = await apiClient.get("/llm/config");
  return response.data;
};

/**
 * Save LLM configuration
 */
export const saveLLMConfig = async (
  model: string,
): Promise<{ success: boolean; validated: boolean; error?: string }> => {
  const response = await apiClient.post("/llm/config", { model });
  return response.data;
};
