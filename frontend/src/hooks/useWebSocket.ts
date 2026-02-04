/**
 * useWebSocket Hook
 * React hook for WebSocket connection management
 */

import { useEffect, useState, useCallback } from "react";
import {
  websocketClient,
  WebSocketMessage,
  ProgressUpdate,
  ErrorPayload,
  CompletePayload,
} from "../services/websocket";

export interface UseWebSocketOptions {
  onProgress?: (update: ProgressUpdate) => void;
  onError?: (error: ErrorPayload) => void;
  onComplete?: (complete: CompletePayload) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (
  projectId: string | null,
  options: UseWebSocketOptions = {},
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  // Handle incoming messages
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      setMessages((prev) => [...prev, message]);

      switch (message.type) {
        case "progress":
          options.onProgress?.(message.payload);
          break;
        case "error":
          options.onError?.(message.payload);
          break;
        case "complete":
          options.onComplete?.(message.payload);
          break;
      }
    },
    [options],
  );

  // Handle connection
  const handleConnect = useCallback(() => {
    setIsConnected(true);
    options.onConnect?.();
  }, [options]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    options.onDisconnect?.();
  }, [options]);

  // Connect/disconnect effect
  useEffect(() => {
    if (!projectId) {
      return;
    }

    // Connect to WebSocket
    websocketClient.connect(projectId);

    // Set up event handlers
    const cleanupMessage = websocketClient.onMessage(handleMessage);
    const cleanupConnect = websocketClient.onConnect(handleConnect);
    const cleanupDisconnect = websocketClient.onDisconnect(handleDisconnect);

    // Cleanup on unmount
    return () => {
      cleanupMessage();
      cleanupConnect();
      cleanupDisconnect();
      websocketClient.disconnect();
    };
  }, [projectId, handleMessage, handleConnect, handleDisconnect]);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Send ping
  const ping = useCallback(() => {
    websocketClient.ping();
  }, []);

  return {
    isConnected,
    messages,
    clearMessages,
    ping,
  };
};

export default useWebSocket;
