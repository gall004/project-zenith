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
import type { EnableMultimodalInputEvent } from "@/types/websocket";

export function VoiceSessionClient(): React.JSX.Element {
  const [identity] = useState(
    () => `user-${Math.floor(Math.random() * 100000)}`
  );
  const [multimodalEvent, setMultimodalEvent] =
    useState<EnableMultimodalInputEvent | null>(null);


  const handleMultimodalIntercept = useCallback(
    (event: EnableMultimodalInputEvent) => {
      setMultimodalEvent(event);
    },
    []
  );

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      {/* LiveKit Session — compact when chat is active */}
        <div className="shrink-0 p-4 pb-0">
          <LiveKitSession
            roomName="gecx-demo-engine"
            identity={identity}
            multimodalEvent={multimodalEvent}
          />
        </div>

      {/* Chat Container — fills remaining space */}
      <div className="flex-1 min-h-0">
        <ChatContainer
          onMultimodalIntercept={handleMultimodalIntercept}
        />
      </div>
    </div>
  );
}
