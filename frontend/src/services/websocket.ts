/**
 * WebSocket Client
 * Socket.io client wrapper for real-time updates
 */

import { io, Socket } from "socket.io-client";

const WS_BASE_URL = import.meta.env.VITE_WS_URL || "http://localhost:4000";

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

export type MessageHandler = (message: WebSocketMessage) => void;
export type ConnectHandler = () => void;
export type DisconnectHandler = () => void;
export type ErrorHandler = (error: Error) => void;

/**
 * WebSocket Client Class
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private projectId: string | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private connectHandlers: Set<ConnectHandler> = new Set();
  private disconnectHandlers: Set<DisconnectHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  /**
   * Connect to WebSocket server for a specific project
   */
  connect(projectId: string): void {
    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    this.projectId = projectId;

    // Create socket connection
    this.socket = io(WS_BASE_URL, {
      query: { projectId },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Set up event listeners
    this.socket.on("connected", (data) => {
      console.log("WebSocket connected:", data);
      this.connectHandlers.forEach((handler) => handler());
    });

    this.socket.on("message", (message: WebSocketMessage) => {
      console.log("WebSocket message:", message);
      this.messageHandlers.forEach((handler) => handler(message));
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      this.disconnectHandlers.forEach((handler) => handler());
    });

    this.socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      this.errorHandlers.forEach((handler) => handler(error));
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.errorHandlers.forEach((handler) => handler(error));
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.projectId = null;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get current project ID
   */
  getProjectId(): string | null {
    return this.projectId;
  }

  /**
   * Send ping to server
   */
  ping(): void {
    if (this.socket) {
      this.socket.emit("ping");
    }
  }

  /**
   * Add message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    // Return cleanup function
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  /**
   * Add connect handler
   */
  onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.add(handler);
    return () => {
      this.connectHandlers.delete(handler);
    };
  }

  /**
   * Add disconnect handler
   */
  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => {
      this.disconnectHandlers.delete(handler);
    };
  }

  /**
   * Add error handler
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Remove all handlers
   */
  removeAllHandlers(): void {
    this.messageHandlers.clear();
    this.connectHandlers.clear();
    this.disconnectHandlers.clear();
    this.errorHandlers.clear();
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();
export default websocketClient;
