/**
 * useZenithSocket — WebSocket client hook (US-05)
 *
 * Establishes and manages a persistent WebSocket connection to the
 * backend with exponential backoff reconnection and jitter.
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type {
  WebSocketEvent,
  ConnectionStatus,
} from "@/types/websocket";

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 1000;

interface UseZenithSocketReturn {
  isConnected: boolean;
  connectionStatus: ConnectionStatus;
  reconnectAttempt: number;
  lastMessage: WebSocketEvent | null;
  sendMessage: (event: WebSocketEvent) => void;
}

function getWebSocketUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
  const wsProtocol = baseUrl.startsWith("https") ? "wss" : "ws";
  const host = baseUrl.replace(/^https?:\/\//, "");
  return `${wsProtocol}://${host}/api/v1/ws`;
}

/**
 * Calculate reconnect delay with exponential backoff and jitter
 * per error-handling.md §5.
 */
function calculateReconnectDelay(attempt: number): number {
  const exponentialDelay =
    BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_RECONNECT_DELAY_MS;
  return exponentialDelay + jitter;
}

export function useZenithSocket(): UseZenithSocketReturn {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const reconnectAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(
    null
  );

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(function connectImpl() {
    if (!isMountedRef.current) return;

    const url = getWebSocketUrl();
    const socket = new WebSocket(url);

    socket.onopen = () => {
      if (!isMountedRef.current) return;
      reconnectAttemptRef.current = 0;
      setReconnectAttempt(0);
      setConnectionStatus("connected");
    };

    socket.onmessage = (messageEvent: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const parsed = JSON.parse(
          messageEvent.data as string
        ) as WebSocketEvent;
        setLastMessage(parsed);
      } catch {
        // Silently drop unparseable frames
      }
    };

    socket.onclose = () => {
      if (!isMountedRef.current) return;

      if (
        reconnectAttemptRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        setConnectionStatus("reconnecting");
        const delay = calculateReconnectDelay(
          reconnectAttemptRef.current
        );
        reconnectAttemptRef.current += 1;
        setReconnectAttempt(reconnectAttemptRef.current);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectImpl();
        }, delay);
      } else {
        setConnectionStatus("disconnected");
      }
    };

    socket.onerror = () => {
      // Error fires before close — let onclose handle reconnection
      socket.close();
    };

    socketRef.current = socket;
  }, []);

  const sendMessage = useCallback(
    (event: WebSocketEvent): void => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.send(JSON.stringify(event));
      }
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearReconnectTimeout();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect, clearReconnectTimeout]);

  return {
    isConnected: connectionStatus === "connected",
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  };
}
