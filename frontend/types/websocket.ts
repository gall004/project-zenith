/**
 * WebSocket Event Type Definitions (US-06)
 *
 * Discriminated union types for the Zenith WebSocket protocol.
 * Mirrors the backend Pydantic schemas in app/models/websocket.py.
 */

export type WebSocketEventType =
  | "chat_message"
  | "agent_response"
  | "user_transcription"
  | "session_event"
  | "error";

export interface AttachmentPayload {
  mime_type: string;
  data: string;
}

/** Payload for user-originated chat messages. */
export interface ChatMessagePayload {
  text: string;
  sender: "user";
  attachments?: AttachmentPayload[];
}

/** Payload for agent-originated responses. */
export interface AgentResponsePayload {
  text: string;
  sender: "agent";
}

/** Payload for session lifecycle events. */
export interface SessionEventPayload {
  event: string;
  detail: string | null;
  escalation_message?: string;
  phone_transfer?: string;
}

/** Payload for structured error frames. */
export interface ErrorPayload {
  code: string;
  message: string;
}

/** Discriminated union: chat_message event. */
export interface ChatMessageEvent {
  type: "chat_message";
  payload: ChatMessagePayload;
  timestamp: string;
}

/** Discriminated union: agent_response event. */
export interface AgentResponseEvent {
  type: "agent_response";
  payload: AgentResponsePayload;
  timestamp: string;
}

/** Discriminated union: user_transcription event (voice-to-text). */
export interface UserTranscriptionEvent {
  type: "user_transcription";
  payload: { text: string; sender: "user" };
  timestamp: string;
}

/** Discriminated union: session_event event. */
export interface SessionEvent {
  type: "session_event";
  payload: SessionEventPayload;
  timestamp: string;
}

/** Discriminated union: error event. */
export interface ErrorEvent {
  type: "error";
  payload: ErrorPayload;
  timestamp: string;
}

/**
 * The canonical WebSocket event union type.
 * Use the `type` field as the discriminant for narrowing.
 */
export type WebSocketEvent =
  | ChatMessageEvent
  | AgentResponseEvent
  | UserTranscriptionEvent
  | SessionEvent
  | ErrorEvent;

/** Connection state exposed by the useZenithSocket hook. */
export type ConnectionStatus = "connected" | "disconnected" | "reconnecting";
