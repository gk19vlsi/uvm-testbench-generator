/**
 * LLM Configuration model
 * Manages LLM provider configuration and model selection
 */

import { Collection, ObjectId, WithId } from "mongodb";
import { getDbSafe } from "../config/database";

export interface LLMConfiguration {
  _id?: ObjectId;
  provider: "openai";
  defaultModel: string;
  models: string[];
  validated: boolean;
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class LLMConfigurationModel {
  private collectionName = "llm_configurations";

  /**
   * Get LLM configurations collection
   */
  private async getCollection(): Promise<Collection<LLMConfiguration>> {
    const db = await getDbSafe();
    return db.collection<LLMConfiguration>(this.collectionName);
  }

  /**
   * Create or update LLM configuration
   */
  async upsert(data: {
    provider: "openai";
    defaultModel: string;
    models?: string[];
    validated?: boolean;
  }): Promise<WithId<LLMConfiguration>> {
    const collection = await this.getCollection();

    const now = new Date();
    const config: Partial<LLMConfiguration> = {
      provider: data.provider,
      defaultModel: data.defaultModel,
      models: data.models || ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
      validated: data.validated || false,
      validatedAt: data.validated ? now : undefined,
      updatedAt: now,
    };

    const result = await collection.findOneAndUpdate(
      { provider: data.provider },
      {
        $set: config,
        $setOnInsert: {
          createdAt: now,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
      },
    );

    return result as WithId<LLMConfiguration>;
  }

  /**
   * Find configuration by provider
   */
  async findByProvider(
    provider: "openai",
  ): Promise<WithId<LLMConfiguration> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ provider });
  }

  /**
   * Get current configuration (defaults to OpenAI)
   */
  async getCurrent(): Promise<WithId<LLMConfiguration> | null> {
    return await this.findByProvider("openai");
  }

  /**
   * Update default model
   */
  async updateDefaultModel(
    provider: "openai",
    defaultModel: string,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { provider },
      {
        $set: {
          defaultModel,
          updatedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Mark configuration as validated
   */
  async markValidated(
    provider: "openai",
    validated: boolean,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const update: any = {
      validated,
      updatedAt: new Date(),
    };

    if (validated) {
      update.validatedAt = new Date();
    }

    const result = await collection.updateOne({ provider }, { $set: update });

    return result.modifiedCount > 0;
  }

  /**
   * Add model to available models list
   */
  async addModel(provider: "openai", model: string): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { provider },
      {
        $addToSet: { models: model },
        $set: { updatedAt: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Remove model from available models list
   */
  async removeModel(provider: "openai", model: string): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { provider },
      {
        $pull: { models: model },
        $set: { updatedAt: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete configuration
   */
  async delete(provider: "openai"): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ provider });
    return result.deletedCount > 0;
  }

  /**
   * Check if configuration exists
   */
  async exists(provider: "openai"): Promise<boolean> {
    const collection = await this.getCollection();
    const count = await collection.countDocuments({ provider }, { limit: 1 });
    return count > 0;
  }

  /**
   * Initialize default configuration if not exists
   */
  async initializeDefault(): Promise<WithId<LLMConfiguration>> {
    const existing = await this.getCurrent();
    if (existing) {
      return existing;
    }

    return await this.upsert({
      provider: "openai",
      defaultModel: "gpt-4",
      models: ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
      validated: false,
    });
  }
}

// Export singleton instance
export const llmConfigurationModel = new LLMConfigurationModel();
export default llmConfigurationModel;
