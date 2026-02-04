/**
 * Generation model
 * Manages generation data and agent execution tracking
 */

import { Collection, ObjectId, WithId } from "mongodb";
import { getDbSafe } from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface AgentExecution {
  agentName: string;
  startedAt: Date;
  completedAt?: Date;
  status: "queued" | "in_progress" | "completed" | "failed";
  executionTime?: number;
  tokensUsed?: number;
  error?: string;
}

export interface GenerationOutputs {
  specificationAgent?: any;
  rtlAgent?: any;
  alignmentAgent?: any;
  architectureAgent?: any;
  generatorAgent?: any;
  sequenceAgent?: any;
  validationAgent?: any;
}

export interface GenerationError {
  agentName: string;
  message: string;
  stack?: string;
  timestamp: Date;
}

export interface Generation {
  _id?: ObjectId;
  generationId: string;
  projectId: string;
  startedAt: Date;
  completedAt?: Date;
  status: "queued" | "in_progress" | "completed" | "failed";
  agentExecutions: AgentExecution[];
  outputs?: GenerationOutputs;
  error?: GenerationError;
}

export class GenerationModel {
  private collectionName = "generations";

  /**
   * Get generations collection
   */
  private async getCollection(): Promise<Collection<Generation>> {
    const db = await getDbSafe();
    return db.collection<Generation>(this.collectionName);
  }

  /**
   * Create a new generation
   */
  async create(projectId: string): Promise<WithId<Generation>> {
    const collection = await this.getCollection();

    const generation: Generation = {
      generationId: uuidv4(),
      projectId,
      startedAt: new Date(),
      status: "queued",
      agentExecutions: [],
    };

    const result = await collection.insertOne(generation);
    return { ...generation, _id: result.insertedId };
  }

  /**
   * Find generation by generationId
   */
  async findByGenerationId(
    generationId: string,
  ): Promise<WithId<Generation> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ generationId });
  }

  /**
   * Find generation by MongoDB _id
   */
  async findById(id: ObjectId): Promise<WithId<Generation> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ _id: id });
  }

  /**
   * Find all generations for a project
   */
  async findByProjectId(
    projectId: string,
    options?: {
      limit?: number;
      skip?: number;
      sort?: { [key: string]: 1 | -1 };
    },
  ): Promise<WithId<Generation>[]> {
    const collection = await this.getCollection();

    let query = collection.find({ projectId });

    if (options?.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ startedAt: -1 }); // Default: newest first
    }

    if (options?.skip) {
      query = query.skip(options.skip);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query.toArray();
  }

  /**
   * Find latest generation for a project
   */
  async findLatestByProjectId(
    projectId: string,
  ): Promise<WithId<Generation> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ projectId }, { sort: { startedAt: -1 } });
  }

  /**
   * Update generation status
   */
  async updateStatus(
    generationId: string,
    status: Generation["status"],
    completedAt?: Date,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const update: any = { status };
    if (completedAt) {
      update.completedAt = completedAt;
    }

    const result = await collection.updateOne(
      { generationId },
      { $set: update },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Add agent execution
   */
  async addAgentExecution(
    generationId: string,
    agentExecution: AgentExecution,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { generationId },
      { $push: { agentExecutions: agentExecution } },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update agent execution
   */
  async updateAgentExecution(
    generationId: string,
    agentName: string,
    updates: Partial<AgentExecution>,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    // Build update object for array element
    const setFields: any = {};
    Object.keys(updates).forEach((key) => {
      setFields[`agentExecutions.$[elem].${key}`] = (updates as any)[key];
    });

    const result = await collection.updateOne(
      { generationId },
      { $set: setFields },
      {
        arrayFilters: [{ "elem.agentName": agentName }],
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update agent output
   */
  async updateAgentOutput(
    generationId: string,
    agentName: string,
    output: any,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    // Map agent name to output field
    const outputFieldMap: { [key: string]: string } = {
      "Specification Agent": "specificationAgent",
      "RTL Agent": "rtlAgent",
      "Alignment Agent": "alignmentAgent",
      "Architecture Agent": "architectureAgent",
      "Generator Agent": "generatorAgent",
      "Sequence Agent": "sequenceAgent",
      "Validation Agent": "validationAgent",
    };

    const field = outputFieldMap[agentName];
    if (!field) {
      throw new Error(`Unknown agent name: ${agentName}`);
    }

    const result = await collection.updateOne(
      { generationId },
      { $set: { [`outputs.${field}`]: output } },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Set generation error
   */
  async setError(
    generationId: string,
    error: GenerationError,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { generationId },
      {
        $set: {
          error,
          status: "failed",
          completedAt: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Delete generation
   */
  async delete(generationId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ generationId });
    return result.deletedCount > 0;
  }

  /**
   * Delete all generations for a project
   */
  async deleteByProjectId(projectId: string): Promise<number> {
    const collection = await this.getCollection();
    const result = await collection.deleteMany({ projectId });
    return result.deletedCount;
  }

  /**
   * Count generations
   */
  async count(filter?: Partial<Generation>): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments(filter || {});
  }

  /**
   * Check if generation exists
   */
  async exists(generationId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const count = await collection.countDocuments(
      { generationId },
      { limit: 1 },
    );
    return count > 0;
  }

  /**
   * Get generation statistics
   */
  async getStatistics(generationId: string): Promise<{
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    totalExecutionTime: number;
    totalTokensUsed: number;
  } | null> {
    const generation = await this.findByGenerationId(generationId);
    if (!generation) return null;

    const stats = {
      totalAgents: generation.agentExecutions.length,
      completedAgents: generation.agentExecutions.filter(
        (e) => e.status === "completed",
      ).length,
      failedAgents: generation.agentExecutions.filter(
        (e) => e.status === "failed",
      ).length,
      totalExecutionTime: generation.agentExecutions.reduce(
        (sum, e) => sum + (e.executionTime || 0),
        0,
      ),
      totalTokensUsed: generation.agentExecutions.reduce(
        (sum, e) => sum + (e.tokensUsed || 0),
        0,
      ),
    };

    return stats;
  }
}

// Export singleton instance
export const generationModel = new GenerationModel();
export default generationModel;
