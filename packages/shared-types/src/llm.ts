import { ObjectId } from "mongodb";

export type LLMProvider = "openai";
export type LLMModel = "gpt-4" | "gpt-3.5-turbo" | "gpt-4-turbo";

export interface LLMConfiguration {
  _id: ObjectId;
  provider: LLMProvider;
  defaultModel: LLMModel;
  models: LLMModel[];
  validated: boolean;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LLMConfigRequest {
  model: LLMModel;
}

export interface LLMConfigResponse {
  provider: LLMProvider;
  model: LLMModel;
  validated: boolean;
}

export interface LLMValidationResponse {
  valid: boolean;
  error?: string;
}
