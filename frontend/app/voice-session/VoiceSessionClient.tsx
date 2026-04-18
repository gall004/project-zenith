/**
 * VoiceSessionClient — Client-side orchestrator for dual-channel UI
 *
 * Wires the ChatContainer and LiveKitSession together, routing
 * the `enable_multimodal_input` WebSocket event from the chat
 * layer into the LiveKit intercept handler.
 */

"use client";

import { useState, useCallback } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import { LiveKitSession } from "@/components/LiveKitSession";
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
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* LiveKit Session or Escalation State */}
      <div className="shrink-0 p-4 pb-0">
        {escalationData ? (
          <div className="flex flex-col items-center justify-center p-6 border rounded-xl bg-destructive/10 border-destructive/20 min-h-[200px] w-full shadow-sm text-center space-y-3">
            <h2 className="text-xl font-bold text-destructive">Session Escalated</h2>
            <p className="text-foreground/90 max-w-sm font-medium">
              {escalationData.escalation_message || "Live communication has been paused. A human agent will contact you shortly."}
            </p>
            {escalationData.phone_transfer && (
              <a 
                href={`tel:${escalationData.phone_transfer}`}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-destructive text-destructive-foreground h-10 px-6 py-2 text-sm font-medium transition-colors hover:bg-destructive/90"
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

      {/* Chat Container — fills remaining space */}
      <div className="flex-1 min-h-0">
        <ChatContainer
          roomName={roomName}
          onMultimodalIntercept={handleMultimodalIntercept}
          onSessionEvent={handleSessionEvent}
        />
      </div>
    </div>
  );
}
