/**
 * Project model
 * Manages project data and CRUD operations
 */

import { Collection, ObjectId, WithId } from "mongodb";
import { getDbSafe } from "../config/database";
import { v4 as uuidv4 } from "uuid";

export interface FileReference {
  fileId: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: Date;
  storagePath: string;
}

export interface GenerationConfig {
  mode: "mvp" | "production" | "advanced";
  llmModel?: string;
}

export interface CurrentGeneration {
  generationId: string;
  startedAt: Date;
  completedAt?: Date;
  status: "queued" | "in_progress" | "completed" | "failed";
  currentAgent?: string;
  progress: number;
  error?: string;
}

export interface ProjectResults {
  uvmTree: any; // UVMTreeNode from shared-types
  traceabilityMatrix: any; // TraceabilityMatrix from shared-types
  readinessScore: any; // SimulationReadinessScore from shared-types
  generatedFiles: any[]; // GeneratedFile[] from shared-types
}

export interface Project {
  _id?: ObjectId;
  projectId: string;
  name: string;
  description?: string;
  createdAt: Date;
  lastModified: Date;
  status: "draft" | "generating" | "completed" | "failed";
  specificationFiles: FileReference[];
  rtlFiles: FileReference[];
  generationConfig?: GenerationConfig;
  currentGeneration?: CurrentGeneration;
  results?: ProjectResults;
}

export class ProjectModel {
  private collectionName = "projects";

  /**
   * Get projects collection
   */
  private async getCollection(): Promise<Collection<Project>> {
    const db = await getDbSafe();
    return db.collection<Project>(this.collectionName);
  }

  /**
   * Create a new project
   */
  async create(data: {
    name: string;
    description?: string;
  }): Promise<WithId<Project>> {
    const collection = await this.getCollection();

    const project: Project = {
      projectId: uuidv4(),
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      lastModified: new Date(),
      status: "draft",
      specificationFiles: [],
      rtlFiles: [],
    };

    const result = await collection.insertOne(project);
    return { ...project, _id: result.insertedId };
  }

  /**
   * Find project by projectId
   */
  async findByProjectId(projectId: string): Promise<WithId<Project> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ projectId });
  }

  /**
   * Find project by MongoDB _id
   */
  async findById(id: ObjectId): Promise<WithId<Project> | null> {
    const collection = await this.getCollection();
    return await collection.findOne({ _id: id });
  }

  /**
   * Find all projects
   */
  async findAll(options?: {
    limit?: number;
    skip?: number;
    sort?: { [key: string]: 1 | -1 };
  }): Promise<WithId<Project>[]> {
    const collection = await this.getCollection();

    let query = collection.find({});

    if (options?.sort) {
      query = query.sort(options.sort);
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
   * Update project
   */
  async update(
    projectId: string,
    data: Partial<Omit<Project, "_id" | "projectId" | "createdAt">>,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const result = await collection.updateOne(
      { projectId },
      {
        $set: {
          ...data,
          lastModified: new Date(),
        },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Add file reference to project
   */
  async addFile(
    projectId: string,
    fileType: "specification" | "rtl",
    file: FileReference,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const field =
      fileType === "specification" ? "specificationFiles" : "rtlFiles";

    const result = await collection.updateOne(
      { projectId },
      {
        $push: { [field]: file } as any,
        $set: { lastModified: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Remove file reference from project
   */
  async removeFile(
    projectId: string,
    fileType: "specification" | "rtl",
    fileId: string,
  ): Promise<boolean> {
    const collection = await this.getCollection();

    const field =
      fileType === "specification" ? "specificationFiles" : "rtlFiles";

    const result = await collection.updateOne(
      { projectId },
      {
        $pull: { [field]: { fileId } } as any,
        $set: { lastModified: new Date() },
      },
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update project status
   */
  async updateStatus(
    projectId: string,
    status: Project["status"],
  ): Promise<boolean> {
    return await this.update(projectId, { status });
  }

  /**
   * Update current generation
   */
  async updateCurrentGeneration(
    projectId: string,
    generation: CurrentGeneration,
  ): Promise<boolean> {
    return await this.update(projectId, { currentGeneration: generation });
  }

  /**
   * Update project results
   */
  async updateResults(
    projectId: string,
    results: ProjectResults,
  ): Promise<boolean> {
    return await this.update(projectId, { results });
  }

  /**
   * Delete project
   */
  async delete(projectId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const result = await collection.deleteOne({ projectId });
    return result.deletedCount > 0;
  }

  /**
   * Count projects
   */
  async count(filter?: Partial<Project>): Promise<number> {
    const collection = await this.getCollection();
    return await collection.countDocuments(filter || {});
  }

  /**
   * Check if project exists
   */
  async exists(projectId: string): Promise<boolean> {
    const collection = await this.getCollection();
    const count = await collection.countDocuments({ projectId }, { limit: 1 });
    return count > 0;
  }
}

// Export singleton instance
export const projectModel = new ProjectModel();
export default projectModel;
