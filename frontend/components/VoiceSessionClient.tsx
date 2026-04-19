/**
 * VoiceSessionClient — Client-side orchestrator for dual-channel UI
 *
 * Wires the ChatContainer and LiveKitSession together, routing
 * the `enable_multimodal_input` WebSocket event from the chat
 * layer into the LiveKit intercept handler.
 */

"use client";

import { useState, useCallback } from "react";
import { ChatContainer } from "./ChatContainer";
import { LiveKitSession } from "./LiveKitSession";
import type { EnableMultimodalInputEvent, SessionEvent, SessionEventPayload } from "@/types/websocket";

export function VoiceSessionClient(): React.JSX.Element {
  const [identity] = useState(
    () => `user-${Math.floor(Math.random() * 100000)}`
  );
  const [roomName] = useState(
    () => `session-${Math.floor(Math.random() * 100000)}`
  );
  const [multimodalEvent, setMultimodalEvent] =
    useState<EnableMultimodalInputEvent | null>(null);
  const [escalationData, setEscalationData] = useState<SessionEventPayload | null>(null);


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
        roomName={roomName}
        onMultimodalIntercept={handleMultimodalIntercept}
        onSessionEvent={handleSessionEvent}
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
