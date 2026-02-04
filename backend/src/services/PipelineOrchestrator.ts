/**
 * Pipeline Orchestrator Service
 * Manages the sequential execution of all agents in the testbench generation pipeline
 */

import { ChatOpenAI } from "@langchain/openai";
import { specificationAgent } from "../agents/SpecificationAgent";
import { rtlAgent } from "../agents/RTLAgent";
import { alignmentAgent } from "../agents/AlignmentAgent";
import { architectureAgent } from "../agents/ArchitectureAgent";
import { generatorAgent } from "../agents/GeneratorAgent";
import { sequenceAgent } from "../agents/SequenceAgent";
import { validationAgent } from "../agents/ValidationAgent";
import { webSocketService } from "./WebSocketService";
import { errorRecoveryService } from "./ErrorRecoveryService";
import logger from "../config/logger";

/**
 * Agent execution record
 */
export interface AgentExecution {
  agentName: string;
  startedAt: Date;
  completedAt?: Date;
  status: "queued" | "in_progress" | "completed" | "failed";
  executionTime?: number;
  tokensUsed?: number;
  error?: string;
}

/**
 * Pipeline execution state
 */
export interface PipelineState {
  projectId: string;
  generationId: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  currentAgent?: string;
  progress: number; // 0-100
  agentExecutions: AgentExecution[];
  outputs: {
    specificationAgent?: any;
    rtlAgent?: any;
    alignmentAgent?: any;
    architectureAgent?: any;
    generatorAgent?: any;
    sequenceAgent?: any;
    validationAgent?: any;
  };
  error?: {
    agentName: string;
    message: string;
    stack?: string;
    timestamp: Date;
  };
}

/**
 * Pipeline input data
 */
export interface PipelineInput {
  projectId: string;
  generationId: string;
  specificationFiles: Array<{
    fileId: string;
    filename: string;
    content: string;
  }>;
  rtlFiles: Array<{
    fileId: string;
    filename: string;
    content: string;
  }>;
  llmProvider: ChatOpenAI;
}

/**
 * Pipeline Orchestrator
 * Executes agents in sequence: Specification → RTL → Alignment → Architecture → Generator → Sequence → Validation
 */
export class PipelineOrchestrator {
  private state: PipelineState | null = null;

  /**
   * Execute the complete pipeline with state persistence and error recovery
   */
  async execute(input: PipelineInput): Promise<PipelineState> {
    // Initialize pipeline state
    this.state = {
      projectId: input.projectId,
      generationId: input.generationId,
      status: "in_progress",
      progress: 0,
      agentExecutions: [],
      outputs: {},
    };

    logger.info(
      `Starting pipeline execution for project ${input.projectId}, generation ${input.generationId}`,
    );

    try {
      // Execute agents in sequence with state persistence
      await this.executeSpecificationAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeRTLAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeAlignmentAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeArchitectureAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeGeneratorAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeSequenceAgent(input);
      errorRecoveryService.saveState(this.state);

      await this.executeValidationAgent(input);
      errorRecoveryService.saveState(this.state);

      // Mark pipeline as completed
      this.state.status = "completed";
      this.state.progress = 100;

      // Send completion notification
      webSocketService.sendComplete(input.projectId, {
        timestamp: new Date().toISOString(),
        success: true,
        readinessScore: this.state.outputs.validationAgent?.readinessScore,
        generatedFiles:
          this.state.outputs.generatorAgent?.generatedFiles?.length || 0,
        message: "Testbench generation completed successfully",
      });

      logger.info(
        `Pipeline execution completed for project ${input.projectId}`,
      );

      // Clear saved state after successful completion
      errorRecoveryService.clearSavedState(input.projectId, input.generationId);

      return this.state;
    } catch (error: any) {
      // Mark pipeline as failed
      this.state.status = "failed";
      this.state.error = {
        agentName: this.state.currentAgent || "Unknown",
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      };

      // Log error with appropriate severity
      errorRecoveryService.logError(error, {
        projectId: input.projectId,
        agentName: this.state.currentAgent,
        operation: "Pipeline execution",
        severity: "critical",
      });

      // Create recommendation
      const recommendation = errorRecoveryService.createRecommendation(error, {
        projectId: input.projectId,
        agentName: this.state.currentAgent,
        operation: "Pipeline execution",
      });

      // Send error notification with recommendation
      webSocketService.sendErrorWithRecommendation(
        input.projectId,
        {
          timestamp: new Date().toISOString(),
          agentName: this.state.currentAgent || "Pipeline",
          severity: "critical",
          message: `Pipeline failed: ${error.message}`,
          details: error.stack,
          recoverable: false,
        },
        recommendation,
      );

      logger.critical(
        `Pipeline execution failed for project ${input.projectId}:`,
        {
          error: error.message,
          stack: error.stack,
          recommendation: recommendation.actionable,
        },
      );

      // Save failed state for potential recovery
      errorRecoveryService.saveState(this.state);

      return this.state;
    }
  }

  /**
   * Execute Specification Agent
   */
  private async executeSpecificationAgent(input: PipelineInput): Promise<void> {
    const agentName = "Specification Agent";
    this.state!.currentAgent = agentName;
    this.state!.progress = 0;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    try {
      // Set up progress callback
      specificationAgent.onProgress((update) => {
        webSocketService.sendProgress(input.projectId, {
          timestamp: update.timestamp.toISOString(),
          agentName: update.agentName,
          status: update.status,
          message: update.message,
          details: update.details,
        });
      });

      // Execute agent with retry logic
      const result = await errorRecoveryService.executeWithRetry(
        async () => {
          return await specificationAgent.execute({
            projectId: input.projectId,
            llmProvider: input.llmProvider,
            specificationFiles: input.specificationFiles,
          });
        },
        {
          projectId: input.projectId,
          agentName,
          operation: "Agent execution",
        },
      );

      // Update execution record
      execution.completedAt = new Date();
      execution.executionTime = result.metadata.executionTime;
      execution.tokensUsed = result.metadata.tokensUsed;

      if (!result.success) {
        execution.status = "failed";
        execution.error = result.error;

        // Create recommendation
        const recommendation = errorRecoveryService.createRecommendation(
          new Error(result.error || "Unknown error"),
          {
            projectId: input.projectId,
            agentName,
            operation: "Agent execution",
          },
        );

        // Send error with recommendation
        webSocketService.sendErrorWithRecommendation(
          input.projectId,
          {
            timestamp: new Date().toISOString(),
            agentName,
            severity: "error",
            message: `${agentName} failed: ${result.error}`,
            details: result.error,
            recoverable: true,
          },
          recommendation,
        );

        throw new Error(`${agentName} failed: ${result.error}`);
      }

      execution.status = "completed";
      this.state!.outputs.specificationAgent = result.data;
      this.state!.progress = 14; // ~14% (1/7 agents)

      logger.info(`${agentName} completed successfully`);
    } catch (error: any) {
      execution.status = "failed";
      execution.error = error.message;
      execution.completedAt = new Date();

      // Log with appropriate severity
      errorRecoveryService.logError(error, {
        projectId: input.projectId,
        agentName,
        operation: "Agent execution",
      });

      throw error;
    }
  }

  /**
   * Execute RTL Agent
   */
  private async executeRTLAgent(input: PipelineInput): Promise<void> {
    const agentName = "RTL Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    rtlAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await rtlAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      rtlFiles: input.rtlFiles,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.rtlAgent = result.data;
    this.state!.progress = 28; // ~28% (2/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Execute Alignment Agent
   */
  private async executeAlignmentAgent(input: PipelineInput): Promise<void> {
    const agentName = "Alignment Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    alignmentAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await alignmentAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      previousAgentOutput: {
        specificationData: this.state!.outputs.specificationAgent,
        rtlData: this.state!.outputs.rtlAgent,
      },
      specificationData: this.state!.outputs.specificationAgent,
      rtlData: this.state!.outputs.rtlAgent,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.alignmentAgent = result.data;
    this.state!.progress = 42; // ~42% (3/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Execute Architecture Agent
   */
  private async executeArchitectureAgent(input: PipelineInput): Promise<void> {
    const agentName = "Architecture Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    architectureAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await architectureAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      previousAgentOutput: {
        alignmentData: this.state!.outputs.alignmentAgent,
        specificationData: this.state!.outputs.specificationAgent,
        rtlData: this.state!.outputs.rtlAgent,
      },
      alignmentData: this.state!.outputs.alignmentAgent,
      specificationData: this.state!.outputs.specificationAgent,
      rtlData: this.state!.outputs.rtlAgent,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.architectureAgent = result.data;
    this.state!.progress = 56; // ~56% (4/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Execute Generator Agent
   */
  private async executeGeneratorAgent(input: PipelineInput): Promise<void> {
    const agentName = "Generator Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    generatorAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await generatorAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      previousAgentOutput: {
        architectureData: this.state!.outputs.architectureAgent,
        rtlData: this.state!.outputs.rtlAgent,
      },
      architectureData: this.state!.outputs.architectureAgent,
      rtlData: this.state!.outputs.rtlAgent,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.generatorAgent = result.data;
    this.state!.progress = 70; // ~70% (5/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Execute Sequence Agent
   */
  private async executeSequenceAgent(input: PipelineInput): Promise<void> {
    const agentName = "Sequence Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    sequenceAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await sequenceAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      previousAgentOutput: {
        architectureData: this.state!.outputs.architectureAgent,
        specificationData: this.state!.outputs.specificationAgent,
        generatorData: this.state!.outputs.generatorAgent,
      },
      architectureData: this.state!.outputs.architectureAgent,
      specificationData: this.state!.outputs.specificationAgent,
      generatorData: this.state!.outputs.generatorAgent,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.sequenceAgent = result.data;
    this.state!.progress = 84; // ~84% (6/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Execute Validation Agent
   */
  private async executeValidationAgent(input: PipelineInput): Promise<void> {
    const agentName = "Validation Agent";
    this.state!.currentAgent = agentName;

    const execution: AgentExecution = {
      agentName,
      startedAt: new Date(),
      status: "in_progress",
    };
    this.state!.agentExecutions.push(execution);

    logger.info(`Executing ${agentName}...`);

    // Set up progress callback
    validationAgent.onProgress((update) => {
      webSocketService.sendProgress(input.projectId, {
        timestamp: update.timestamp.toISOString(),
        agentName: update.agentName,
        status: update.status,
        message: update.message,
        details: update.details,
      });
    });

    // Execute agent
    const result = await validationAgent.execute({
      projectId: input.projectId,
      llmProvider: input.llmProvider,
      previousAgentOutput: {
        generatorData: this.state!.outputs.generatorAgent,
        sequenceData: this.state!.outputs.sequenceAgent,
        rtlData: this.state!.outputs.rtlAgent,
      },
      generatorData: this.state!.outputs.generatorAgent,
      sequenceData: this.state!.outputs.sequenceAgent,
      rtlData: this.state!.outputs.rtlAgent,
    });

    // Update execution record
    execution.completedAt = new Date();
    execution.executionTime = result.metadata.executionTime;
    execution.tokensUsed = result.metadata.tokensUsed;

    if (!result.success) {
      execution.status = "failed";
      execution.error = result.error;
      throw new Error(`${agentName} failed: ${result.error}`);
    }

    execution.status = "completed";
    this.state!.outputs.validationAgent = result.data;
    this.state!.progress = 100; // 100% (7/7 agents)

    logger.info(`${agentName} completed successfully`);
  }

  /**
   * Get current pipeline state
   */
  getState(): PipelineState | null {
    return this.state;
  }

  /**
   * Recover pipeline from saved state
   */
  async recoverFromSavedState(
    projectId: string,
    generationId: string,
    input: PipelineInput,
  ): Promise<PipelineState | null> {
    const savedState = errorRecoveryService.getSavedState(
      projectId,
      generationId,
    );

    if (!savedState) {
      logger.warn(
        `No saved state found for project ${projectId}, generation ${generationId}`,
      );
      return null;
    }

    logger.info(
      `Recovering pipeline from saved state for project ${projectId}`,
      {
        lastSuccessfulAgent: savedState.lastSuccessfulAgent,
        progress: savedState.state.progress,
      },
    );

    // Restore state
    this.state = savedState.state;
    this.state.status = "in_progress";

    // Notify about recovery
    webSocketService.sendAgentProgress(
      projectId,
      "Pipeline",
      `Recovering from last successful agent: ${savedState.lastSuccessfulAgent || "none"}`,
      {
        progress: this.state.progress,
      },
    );

    try {
      // Resume from last successful agent
      const lastAgent = savedState.lastSuccessfulAgent;

      if (!lastAgent || lastAgent === "Specification Agent") {
        await this.executeRTLAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      if (
        !lastAgent ||
        lastAgent === "Specification Agent" ||
        lastAgent === "RTL Agent"
      ) {
        await this.executeAlignmentAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      if (
        !lastAgent ||
        lastAgent === "Specification Agent" ||
        lastAgent === "RTL Agent" ||
        lastAgent === "Alignment Agent"
      ) {
        await this.executeArchitectureAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      if (
        !lastAgent ||
        lastAgent === "Specification Agent" ||
        lastAgent === "RTL Agent" ||
        lastAgent === "Alignment Agent" ||
        lastAgent === "Architecture Agent"
      ) {
        await this.executeGeneratorAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      if (
        !lastAgent ||
        lastAgent === "Specification Agent" ||
        lastAgent === "RTL Agent" ||
        lastAgent === "Alignment Agent" ||
        lastAgent === "Architecture Agent" ||
        lastAgent === "Generator Agent"
      ) {
        await this.executeSequenceAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      if (
        !lastAgent ||
        lastAgent === "Specification Agent" ||
        lastAgent === "RTL Agent" ||
        lastAgent === "Alignment Agent" ||
        lastAgent === "Architecture Agent" ||
        lastAgent === "Generator Agent" ||
        lastAgent === "Sequence Agent"
      ) {
        await this.executeValidationAgent(input);
        errorRecoveryService.saveState(this.state);
      }

      // Mark as completed
      this.state.status = "completed";
      this.state.progress = 100;

      webSocketService.sendComplete(projectId, {
        timestamp: new Date().toISOString(),
        success: true,
        readinessScore: this.state.outputs.validationAgent?.readinessScore,
        generatedFiles:
          this.state.outputs.generatorAgent?.generatedFiles?.length || 0,
        message: "Pipeline recovered and completed successfully",
      });

      logger.info(`Pipeline recovery completed for project ${projectId}`);

      // Clear saved state
      errorRecoveryService.clearSavedState(projectId, generationId);

      return this.state;
    } catch (error: any) {
      logger.error(`Pipeline recovery failed for project ${projectId}:`, error);

      this.state.status = "failed";
      this.state.error = {
        agentName: this.state.currentAgent || "Unknown",
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
      };

      // Save failed state
      errorRecoveryService.saveState(this.state);

      return this.state;
    }
  }

  /**
   * Reset pipeline state
   */
  reset(): void {
    this.state = null;
  }
}

// Export class for instantiation
export default PipelineOrchestrator;
