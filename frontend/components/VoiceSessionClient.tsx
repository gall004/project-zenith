/**
 * VoiceSessionClient — Client-side orchestrator for dual-channel UI
 *
 * Wires the ChatContainer and LiveKitSession together, routing
 * the `enable_multimodal_input` WebSocket event from the chat
 * layer into the LiveKit intercept handler.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { ChatContainer } from "./ChatContainer";
import { LiveKitSession } from "./LiveKitSession";
import type { EnableMultimodalInputEvent, SessionEvent, SessionEventPayload } from "@/types/websocket";

export function VoiceSessionClient(): React.JSX.Element {
  const [identity, setIdentity] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("zenith_identity");
      if (saved) return saved;
    }
    const val = `user-${Math.floor(Math.random() * 100000)}`;
    if (typeof window !== "undefined") sessionStorage.setItem("zenith_identity", val);
    return val;
  });

  const [roomName, setRoomName] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("zenith_room");
      if (saved) return saved;
    }
    const val = `session-${Math.floor(Math.random() * 100000)}`;
    if (typeof window !== "undefined") sessionStorage.setItem("zenith_room", val);
    return val;
  });

  const [multimodalEvent, setMultimodalEvent] =
    useState<EnableMultimodalInputEvent | null>(() => {
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem("zenith_multimodal");
        if (saved) return JSON.parse(saved);
      }
      return null;
    });

  const [escalationData, setEscalationData] = useState<SessionEventPayload | null>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("zenith_escalation");
      if (saved) return JSON.parse(saved);
    }
    return null;
  });

  // Sync orchestration states
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (multimodalEvent) {
        sessionStorage.setItem("zenith_multimodal", JSON.stringify(multimodalEvent));
      } else {
        sessionStorage.removeItem("zenith_multimodal");
      }
    }
  }, [multimodalEvent]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (escalationData) {
        sessionStorage.setItem("zenith_escalation", JSON.stringify(escalationData));
      } else {
        sessionStorage.removeItem("zenith_escalation");
      }
    }
  }, [escalationData]);

  const handleEndSession = useCallback(async () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("zenith_identity");
      sessionStorage.removeItem("zenith_room");
      sessionStorage.removeItem("zenith_messages"); // will be implemented in ChatContainer
      sessionStorage.removeItem("zenith_multimodal");
      sessionStorage.removeItem("zenith_escalation");
    }
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      await fetch(`${baseUrl}/api/v1/sessions/${roomName}`, { method: "DELETE" });
    } catch (e) {
      console.error("Failed to delete backend session", e);
    }
    // Generate new credentials
    const newId = `user-${Math.floor(Math.random() * 100000)}`;
    const newRoom = `session-${Math.floor(Math.random() * 100000)}`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("zenith_identity", newId);
      sessionStorage.setItem("zenith_room", newRoom);
    }
    setIdentity(newId);
    setRoomName(newRoom);
    setMultimodalEvent(null);
    setEscalationData(null);
  }, [roomName]);


  const handleMultimodalIntercept = useCallback(
    (event: EnableMultimodalInputEvent) => {
      setMultimodalEvent(event);
    },
    []
  );

  const handleSessionEvent = useCallback((event: SessionEvent) => {
    if (event.payload.detail === "escalated") {
      setEscalationData(event.payload);
    }
  }, []);

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden relative">
      <ChatContainer
        key={roomName}
        roomName={roomName}
        onMultimodalIntercept={handleMultimodalIntercept}
        onSessionEvent={handleSessionEvent}
        onEndSession={handleEndSession}
      >
        {/* Render escalation payload OR the live kit video session inside the chat trace */}
        <div className="mt-4 shrink-0">
          {escalationData ? (
            <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-red-500/10 border-red-500/20 w-full shadow-sm text-center space-y-3">
              <h2 className="text-sm font-bold text-red-400">Session Escalated</h2>
              <p className="text-white max-w-sm font-medium text-xs">
                {escalationData.escalation_message || "Live communication has been paused. A human agent will contact you shortly."}
              </p>
              {escalationData.phone_transfer && (
                <a 
                  href={`tel:${escalationData.phone_transfer}`}
                  className="mt-2 inline-flex items-center justify-center rounded-md bg-red-500 text-white h-8 px-4 text-xs font-medium transition-colors hover:bg-red-600"
                >
                  Call Support: {escalationData.phone_transfer}
                </a>
              )}
            </div>
          ) : (
            <LiveKitSession
              roomName={roomName}
              identity={identity}
              multimodalEvent={multimodalEvent}
            />
          )}
        </div>
      </ChatContainer>
    </div>
  );
}
