import { SimulationReadinessScore } from "./validation";
export type WebSocketMessageType = "progress" | "error" | "complete";
export type ErrorSeverity = "warning" | "error" | "critical";
export interface ProgressMessage {
    type: "progress";
    payload: {
        timestamp: string;
        agentName: string;
        status: "started" | "in_progress" | "completed";
        message: string;
        details?: Record<string, any>;
    };
}
export interface ErrorMessage {
    type: "error";
    payload: {
        timestamp: string;
        agentName: string;
        severity: ErrorSeverity;
        message: string;
        details?: string;
        recoverable: boolean;
    };
}
export interface CompleteMessage {
    type: "complete";
    payload: {
        timestamp: string;
        success: boolean;
        readinessScore?: SimulationReadinessScore;
        generatedFiles?: number;
        message: string;
    };
}
export type WebSocketMessage = ProgressMessage | ErrorMessage | CompleteMessage;
//# sourceMappingURL=websocket.d.ts.map