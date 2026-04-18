/**
 * WebSocket Type Definition Tests (US-06)
 *
 * Validates that discriminated union types are correctly structured
 * and can be narrowed via the `type` discriminant field.
 */

import { describe, it, expect } from "vitest";
import type {
  WebSocketEvent,
  ChatMessageEvent,
  AgentResponseEvent,
  EnableMultimodalInputEvent,
  SessionEvent,
  ErrorEvent,
} from "@/types/websocket";

describe("US-06: WebSocket Event Type Definitions", () => {
  it("should type-narrow a ChatMessageEvent via discriminant", () => {
    // Arrange
    const event: WebSocketEvent = {
      type: "chat_message",
      payload: { text: "Hello", sender: "user" },
      timestamp: "2026-04-18T12:00:00Z",
    };

    // Act & Assert
    if (event.type === "chat_message") {
      const narrowed: ChatMessageEvent = event;
      expect(narrowed.payload.text).toBe("Hello");
      expect(narrowed.payload.sender).toBe("user");
    }
  });

  it("should type-narrow an AgentResponseEvent via discriminant", () => {
    // Arrange
    const event: WebSocketEvent = {
      type: "agent_response",
      payload: { text: "Echo: Hello", sender: "agent" },
      timestamp: "2026-04-18T12:00:00Z",
    };

    // Act & Assert
    if (event.type === "agent_response") {
      const narrowed: AgentResponseEvent = event;
      expect(narrowed.payload.sender).toBe("agent");
    }
  });

  it("should type-narrow an EnableMultimodalInputEvent via discriminant", () => {
    // Arrange
    const event: WebSocketEvent = {
      type: "enable_multimodal_input",
      payload: {
        reason: "Device inspection needed",
        camera_requested: true,
        microphone_requested: true,
      },
      timestamp: "2026-04-18T12:00:00Z",
    };

    // Act & Assert
    if (event.type === "enable_multimodal_input") {
      const narrowed: EnableMultimodalInputEvent = event;
      expect(narrowed.payload.camera_requested).toBe(true);
    }
  });

  it("should type-narrow a SessionEvent via discriminant", () => {
    // Arrange
    const event: WebSocketEvent = {
      type: "session_event",
      payload: { event: "connected", detail: null },
      timestamp: "2026-04-18T12:00:00Z",
    };

    // Act & Assert
    if (event.type === "session_event") {
      const narrowed: SessionEvent = event;
      expect(narrowed.payload.event).toBe("connected");
    }
  });

  it("should type-narrow an ErrorEvent via discriminant", () => {
    // Arrange
    const event: WebSocketEvent = {
      type: "error",
      payload: { code: "INVALID_MESSAGE", message: "Bad format" },
      timestamp: "2026-04-18T12:00:00Z",
    };

    // Act & Assert
    if (event.type === "error") {
      const narrowed: ErrorEvent = event;
      expect(narrowed.payload.code).toBe("INVALID_MESSAGE");
    }
  });

  it("should contain all required fields on every event variant", () => {
    // Arrange
    const events: WebSocketEvent[] = [
      {
        type: "chat_message",
        payload: { text: "test", sender: "user" },
        timestamp: "2026-04-18T12:00:00Z",
      },
      {
        type: "agent_response",
        payload: { text: "reply", sender: "agent" },
        timestamp: "2026-04-18T12:00:00Z",
      },
      {
        type: "enable_multimodal_input",
        payload: {
          reason: "test",
          camera_requested: true,
          microphone_requested: false,
        },
        timestamp: "2026-04-18T12:00:00Z",
      },
      {
        type: "session_event",
        payload: { event: "start", detail: null },
        timestamp: "2026-04-18T12:00:00Z",
      },
      {
        type: "error",
        payload: { code: "ERR", message: "fail" },
        timestamp: "2026-04-18T12:00:00Z",
      },
    ];

    // Act & Assert
    for (const event of events) {
      expect(event).toHaveProperty("type");
      expect(event).toHaveProperty("payload");
      expect(event).toHaveProperty("timestamp");
    }
  });
});
