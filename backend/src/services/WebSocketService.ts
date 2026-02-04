/**
 * WebSocket Service
 * Manages Socket.io connections and real-time progress updates
 */

import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import logger from "../config/logger";
import { env } from "../config/env";

export interface ProgressUpdate {
  timestamp: string;
  agentName: string;
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
  details?: Record<string, any>;
}

export interface ErrorPayload {
  timestamp: string;
  agentName: string;
  severity: "warning" | "error" | "critical";
  message: string;
  details?: string;
  recoverable: boolean;
  recommendation?: {
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    actionable: string;
  };
}

export interface CompletePayload {
  timestamp: string;
  success: boolean;
  readinessScore?: any;
  generatedFiles?: number;
  message: string;
}

export type WebSocketMessage =
  | { type: "progress"; payload: ProgressUpdate }
  | { type: "error"; payload: ErrorPayload }
  | { type: "complete"; payload: CompletePayload };

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, Set<string>> = new Map(); // projectId -> Set<socketId>

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.corsOrigin,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupEventHandlers();
    logger.info("WebSocket server initialized");

    return this.io;
  }

  /**
   * Set up Socket.io event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });
  }

  /**
   * Handle new client connection
   */
  private handleConnection(socket: Socket): void {
    const projectId = socket.handshake.query.projectId as string;

    logger.info(`WebSocket client connected: ${socket.id}`);

    if (projectId) {
      // Join project-specific room
      socket.join(`project:${projectId}`);
      logger.info(`Client ${socket.id} joined project room: ${projectId}`);

      // Track connected clients
      if (!this.connectedClients.has(projectId)) {
        this.connectedClients.set(projectId, new Set());
      }
      this.connectedClients.get(projectId)!.add(socket.id);

      // Send connection acknowledgment
      socket.emit("connected", {
        message: "Connected to project updates",
        projectId,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn(`Client ${socket.id} connected without projectId`);
    }

    // Handle disconnection
    socket.on("disconnect", () => {
      this.handleDisconnection(socket, projectId);
    });

    // Handle errors
    socket.on("error", (error) => {
      logger.error(`WebSocket error for client ${socket.id}:`, error);
    });

    // Handle ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: new Date().toISOString() });
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, projectId?: string): void {
    logger.info(`WebSocket client disconnected: ${socket.id}`);

    if (projectId && this.connectedClients.has(projectId)) {
      this.connectedClients.get(projectId)!.delete(socket.id);

      // Clean up empty project sets
      if (this.connectedClients.get(projectId)!.size === 0) {
        this.connectedClients.delete(projectId);
      }
    }
  }

  /**
   * Send progress update to project room
   */
  sendProgress(projectId: string, update: ProgressUpdate): void {
    if (!this.io) {
      logger.warn("WebSocket server not initialized");
      return;
    }

    const message: WebSocketMessage = {
      type: "progress",
      payload: update,
    };

    this.io.to(`project:${projectId}`).emit("message", message);

    logger.debug(`Sent progress update to project ${projectId}:`, {
      agent: update.agentName,
      status: update.status,
    });
  }

  /**
   * Send error notification to project room
   */
  sendError(projectId: string, error: ErrorPayload): void {
    if (!this.io) {
      logger.warn("WebSocket server not initialized");
      return;
    }

    const message: WebSocketMessage = {
      type: "error",
      payload: error,
    };

    this.io.to(`project:${projectId}`).emit("message", message);

    logger.warn(`Sent error notification to project ${projectId}:`, {
      agent: error.agentName,
      severity: error.severity,
      message: error.message,
    });
  }

  /**
   * Send error notification with recommendation
   */
  sendErrorWithRecommendation(
    projectId: string,
    error: ErrorPayload,
    recommendation: {
      severity: "critical" | "warning" | "info";
      category: string;
      message: string;
      actionable: string;
    },
  ): void {
    const errorWithRecommendation: ErrorPayload = {
      ...error,
      recommendation,
    };

    this.sendError(projectId, errorWithRecommendation);

    logger.warn(`Sent error with recommendation to project ${projectId}:`, {
      agent: error.agentName,
      severity: error.severity,
      recommendation: recommendation.actionable,
    });
  }

  /**
   * Send completion notification to project room
   */
  sendComplete(projectId: string, complete: CompletePayload): void {
    if (!this.io) {
      logger.warn("WebSocket server not initialized");
      return;
    }

    const message: WebSocketMessage = {
      type: "complete",
      payload: complete,
    };

    this.io.to(`project:${projectId}`).emit("message", message);

    logger.info(`Sent completion notification to project ${projectId}:`, {
      success: complete.success,
    });
  }

  /**
   * Send agent started notification
   */
  sendAgentStarted(
    projectId: string,
    agentName: string,
    message: string,
  ): void {
    this.sendProgress(projectId, {
      timestamp: new Date().toISOString(),
      agentName,
      status: "started",
      message,
    });
  }

  /**
   * Send agent in progress notification
   */
  sendAgentProgress(
    projectId: string,
    agentName: string,
    message: string,
    details?: Record<string, any>,
  ): void {
    this.sendProgress(projectId, {
      timestamp: new Date().toISOString(),
      agentName,
      status: "in_progress",
      message,
      details,
    });
  }

  /**
   * Send agent completed notification
   */
  sendAgentCompleted(
    projectId: string,
    agentName: string,
    message: string,
    details?: Record<string, any>,
  ): void {
    this.sendProgress(projectId, {
      timestamp: new Date().toISOString(),
      agentName,
      status: "completed",
      message,
      details,
    });
  }

  /**
   * Send agent failed notification
   */
  sendAgentFailed(
    projectId: string,
    agentName: string,
    message: string,
    details?: Record<string, any>,
  ): void {
    this.sendProgress(projectId, {
      timestamp: new Date().toISOString(),
      agentName,
      status: "failed",
      message,
      details,
    });
  }

  /**
   * Get connected clients count for a project
   */
  getConnectedClientsCount(projectId: string): number {
    return this.connectedClients.get(projectId)?.size || 0;
  }

  /**
   * Get all connected projects
   */
  getConnectedProjects(): string[] {
    return Array.from(this.connectedClients.keys());
  }

  /**
   * Get total connected clients
   */
  getTotalConnectedClients(): number {
    let total = 0;
    for (const clients of this.connectedClients.values()) {
      total += clients.size;
    }
    return total;
  }

  /**
   * Check if project has connected clients
   */
  hasConnectedClients(projectId: string): boolean {
    return this.getConnectedClientsCount(projectId) > 0;
  }

  /**
   * Disconnect all clients for a project
   */
  disconnectProject(projectId: string): void {
    if (!this.io) return;

    const room = `project:${projectId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);

    if (sockets) {
      for (const socketId of sockets) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }

    this.connectedClients.delete(projectId);
    logger.info(`Disconnected all clients from project: ${projectId}`);
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.connectedClients.clear();
      logger.info("WebSocket server closed");
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
