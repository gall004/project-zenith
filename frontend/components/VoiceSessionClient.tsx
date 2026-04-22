/**
 * VoiceSessionClient — Client-side orchestrator for dual-channel UI
 *
 * Wires the ChatContainer and LiveKitSession together, routing
 * the `enable_multimodal_input` WebSocket event from the chat
 * layer into the LiveKit intercept handler.
 *
 * Session state is hydrated from the backend (Redis) — not from
 * browser sessionStorage. The only client-side persistence is
 * a lightweight cookie (`zenith_session_room`) used as a handle.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { ChatContainer } from "./ChatContainer";
import { LiveKitSession } from "./LiveKitSession";
import type { EnableMultimodalInputEvent, SessionEvent, SessionEventPayload } from "@/types/websocket";
import {
  createSession,
  hydrateSession,
  endSession as endSessionApi,
  getSessionCookie,
} from "@/lib/api/sessions";

type HydrationPhase = "loading" | "ready" | "error";

export interface VoiceSessionClientProps {
  onSessionStateChange?: (isActive: boolean) => void;
  isOpen?: boolean;
}

export function VoiceSessionClient({ onSessionStateChange, isOpen = false }: VoiceSessionClientProps): React.JSX.Element {
  const [identity, setIdentity] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string>("");
  const [sessionStatus, setSessionStatus] = useState<"active" | "escalated" | "ended">("active");
  const [hydrationPhase, setHydrationPhase] = useState<HydrationPhase>("loading");

  const [multimodalEvent, setMultimodalEvent] =
    useState<EnableMultimodalInputEvent | null>(null);

  const [escalationData, setEscalationData] = useState<SessionEventPayload | null>(null);



  // ──────────────────────────────────────────────
  // Hydrate session from backend on mount
  // ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        const existingRoom = getSessionCookie();

        if (existingRoom) {
          // Attempt to resume from backend
          const session = await hydrateSession(existingRoom);
          if (session) {
            if (!cancelled) {
              setRoomName(session.room_name);
              setIdentity(session.identity);
              setSessionStatus(session.status);

              // Restore multimodal and escalation state from backend
              if (session.multimodal_event) {
                setMultimodalEvent({
                  type: "enable_multimodal_input",
                  payload: {
                    reason: session.multimodal_event.reason,
                    camera_requested: session.multimodal_event.camera_requested,
                    microphone_requested: session.multimodal_event.microphone_requested,
                    pipeline_type: session.multimodal_event.pipeline_type,
                  },
                  timestamp: session.updated_at,
                });
              }

              if (session.escalation_data) {
                setEscalationData(session.escalation_data as SessionEventPayload);
              }

              setHydrationPhase("ready");
              
              if (session.multimodal_event || session.escalation_data) {
                onSessionStateChange?.(true);
              }
            }
            return; // ALWAYS return if session was found, to prevent fallback to createSession
          }
        }

        if (cancelled) return;

        // No existing session — create a fresh one
        const newSession = await createSession();
        if (!cancelled) {
          setRoomName(newSession.room_name);
          setIdentity(newSession.identity);
          setHydrationPhase("ready");
        }
      } catch (err) {
        console.error("Session hydration failed", err);
        if (!cancelled) setHydrationPhase("error");
      }
    }

    hydrate();
    return () => { cancelled = true; };
  }, []);

  // ──────────────────────────────────────────────
  // WebSocket event handlers (update local state)
  // ──────────────────────────────────────────────
  const markSessionActive = useCallback(() => {
    onSessionStateChange?.(true);
  }, [onSessionStateChange]);

  const handleMultimodalIntercept = useCallback(
    (event: EnableMultimodalInputEvent) => {
      setMultimodalEvent(event);
      markSessionActive();
      // No sessionStorage write — backend already persisted via write-before-emit
    },
    [markSessionActive]
  );

  const handleSessionEvent = useCallback((event: SessionEvent) => {
    if (event.payload.detail === "escalated") {
      setEscalationData(event.payload);
      markSessionActive();
      // No sessionStorage write — backend already persisted
    } else if (event.payload.event === "multimodal_ended") {
      setMultimodalEvent(null);
    }
  }, [markSessionActive]);

  // ──────────────────────────────────────────────
  // End Session
  // ──────────────────────────────────────────────
  const handleEndSession = useCallback(async () => {
    if (roomName) {
      await endSessionApi(roomName);
    }

    // Create a new session
    try {
      const newSession = await createSession();
      setRoomName(newSession.room_name);
      setIdentity(newSession.identity);
      setMultimodalEvent(null);
      setEscalationData(null);
      // Explicitly mark session as inactive until new interactions happen
      onSessionStateChange?.(false);
    } catch (err) {
      console.error("Failed to create new session after end", err);
    }
  }, [roomName, onSessionStateChange]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  if (hydrationPhase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-8 flex-1 text-center p-4">
        <span
          className="material-symbols-outlined text-4xl text-primary mb-2 motion-safe:animate-pulse"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          cloud_sync
        </span>
        <p className="text-sm text-secondary font-body">
          Restoring session...
        </p>
      </div>
    );
  }

  if (hydrationPhase === "error") {
    return (
      <div className="flex flex-col items-center justify-center py-8 flex-1 text-center p-4">
        <span
          className="material-symbols-outlined text-4xl text-error mb-2"
          style={{ fontVariationSettings: "'FILL' 0" }}
        >
          cloud_off
        </span>
        <p className="text-sm text-error font-body">
          Unable to connect to session service. Please try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 text-xs bg-error-container text-on-error-container hover:opacity-90 px-4 py-2 rounded-full transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden relative">
      <ChatContainer
        key={roomName}
        roomName={roomName}
        onMultimodalIntercept={handleMultimodalIntercept}
        onSessionEvent={handleSessionEvent}
        onEndSession={handleEndSession}
        onUserInteraction={markSessionActive}
        isInitialEnded={sessionStatus === "ended"}
      >
        {/* Render escalation payload OR the live kit video session inside the chat trace */}
        <div className="mt-4 shrink-0">
          {escalationData ? (
            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-error-container/30 border-error-container w-full shadow-sm text-center space-y-3">
              <h2 className="text-sm font-bold text-error">Session Escalated</h2>
              <p className="text-on-surface max-w-sm font-medium text-xs">
                {escalationData.escalation_message || "Live communication has been paused. A human agent will contact you shortly."}
              </p>
              {escalationData.phone_transfer && (
                <a 
                  href={`tel:${escalationData.phone_transfer}`}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-primary text-on-primary h-8 px-4 text-xs font-medium transition-colors hover:opacity-90"
                >
                  Call Support: {escalationData.phone_transfer}
                </a>
              )}
            </div>
          ) : (
            <LiveKitSession
              roomName={roomName}
              identity={identity || ""}
              multimodalEvent={multimodalEvent}
              isOpen={isOpen}
            />
          )}
        </div>
      </ChatContainer>
    </div>
  );
}
