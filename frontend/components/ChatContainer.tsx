/**
 * ChatContainer — Text chat UI component (US-07, US-08, US-09)
 *
 * Renders a message list with auto-scroll, text input, and submit.
 * Wired to the useZenithSocket hook for real-time messaging.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useZenithSocket } from "@/hooks/useZenithSocket";
import type {
  WebSocketEvent,
  AgentResponseEvent,
  EnableMultimodalInputEvent,
  SessionEvent,
  ConnectionStatus,
} from "@/types/websocket";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: string;
}

const SCROLL_THRESHOLD_PX = 100;

function ConnectionStatusBadge({
  status,
  attempt,
}: {
  status: ConnectionStatus;
  attempt: number;
}): React.JSX.Element {
  const statusConfig: Record<
    ConnectionStatus,
    { dotColor: string; label: string }
  > = {
    connected: {
      dotColor: "bg-[#00D4FF]",
      label: "Secure Connection Active",
    },
    reconnecting: {
      dotColor: "bg-amber-500",
      label: `Re-establishing link... (${attempt}/5)`,
    },
    disconnected: {
      dotColor: "bg-red-500",
      label: "Link Severed",
    },
  };

  const { dotColor, label } = statusConfig[status];

  return (
    <div
      className="inline-flex items-center gap-2 text-xs text-slate-400 font-label tracking-wide uppercase mb-4"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotColor} ${status === 'connected' ? 'animate-pulse shadow-[0_0_8px_#00D4FF]' : ''}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

function MessageBubble({
  message,
}: {
  message: ChatMessage;
}): React.JSX.Element {
  const isUser = message.sender === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20 rounded-br-none"
            : "bg-white/5 text-slate-300 border border-white/10 rounded-tl-none"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-white/5 border border-white/10 rounded-lg rounded-tl-none px-4 py-3">
        <div className="flex gap-1" aria-label="Agent is typing">
          {[0, 1, 2].map((dotIndex) => (
            <span
              key={dotIndex}
              className="inline-block h-1.5 w-1.5 rounded-full bg-[#00D4FF]/60 motion-safe:animate-bounce"
              style={{
                animationDelay: `${dotIndex * 150}ms`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export interface ChatContainerProps {
  roomName: string;
  onMultimodalIntercept?: (event: EnableMultimodalInputEvent) => void;
  onSessionEvent?: (event: SessionEvent) => void;
  children?: React.ReactNode;
}

export function ChatContainer({
  roomName,
  onMultimodalIntercept,
  onSessionEvent,
  children,
}: ChatContainerProps): React.JSX.Element {
  const {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  } = useZenithSocket(roomName);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageIdCounter = useRef(0);

  const generateMessageId = useCallback((): string => {
    messageIdCounter.current += 1;
    return `msg-${messageIdCounter.current}`;
  }, []);

  // Auto-scroll when new messages arrive and user is near bottom (US-08)
  const scrollToBottom = useCallback(() => {
    if (messageListRef.current && isNearBottom) {
      const container = messageListRef.current;
      const lastChild = container.lastElementChild;
      if (lastChild) {
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        lastChild.scrollIntoView({
          behavior: prefersReducedMotion ? "instant" : "smooth",
        });
      }
    }
  }, [isNearBottom]);

  // Track scroll position to decide if auto-scroll should fire
  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        messageListRef.current;
      const distanceFromBottom =
        scrollHeight - scrollTop - clientHeight;
      setIsNearBottom(distanceFromBottom < SCROLL_THRESHOLD_PX);
    }
  }, []);

  // Process incoming WebSocket messages (US-09, US-10)
  useEffect(() => {
    if (lastMessage === null) return;

    if (lastMessage.type === "agent_response") {
      const agentEvent = lastMessage as AgentResponseEvent;
      const agentMessage: ChatMessage = {
        id: generateMessageId(),
        text: agentEvent.payload.text,
        sender: "agent",
        timestamp: agentEvent.timestamp,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((prev) => [...prev, agentMessage]);
      setIsAwaitingResponse(false);
    }

    if (lastMessage.type === "user_transcription") {
      const transcription = lastMessage as { type: string; payload: { text: string }; timestamp: string };
      const userMessage: ChatMessage = {
        id: generateMessageId(),
        text: `🎙️ ${transcription.payload.text}`,
        sender: "user",
        timestamp: transcription.timestamp,
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((prev) => [...prev, userMessage]);
    }

    if (
      lastMessage.type === "enable_multimodal_input" &&
      onMultimodalIntercept
    ) {
      onMultimodalIntercept(
        lastMessage as EnableMultimodalInputEvent
      );
    }

    if (lastMessage.type === "session_event" && onSessionEvent) {
      onSessionEvent(lastMessage as SessionEvent);
    }
  }, [lastMessage, generateMessageId, onMultimodalIntercept, onSessionEvent]);

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0 || !isConnected) return;

    // Optimistic UI — add user message immediately (US-09)
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      text: trimmed,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsAwaitingResponse(true);

    // Send via WebSocket
    const event: WebSocketEvent = {
      type: "chat_message",
      payload: { text: trimmed, sender: "user" },
      timestamp: userMessage.timestamp,
    };
    sendMessage(event);

    // Clear input and retain focus
    setInputValue("");
    inputRef.current?.focus();
  }, [inputValue, isConnected, sendMessage, generateMessageId]);

  return (
    <div className="flex flex-col h-full w-full" aria-label="Chat">
      <div className="px-2">
        <ConnectionStatusBadge
          status={connectionStatus}
          attempt={reconnectAttempt}
        />
      </div>

      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar min-h-0"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2" style={{fontVariationSettings: "'FILL' 0"}}>forum</span>
            <p className="text-sm text-slate-500 font-body">I am ready to diagnose the issue.</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        {isAwaitingResponse && <TypingIndicator />}
        
        {/* Render LiveKitSession or escalation state inline here so it appears beneath/inside the chat flow */}
        {children}
      </div>

      {/* Input area */}
      <div className="mt-4 relative shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="relative w-full"
        >
          <Input
            ref={inputRef}
            id="chat-input"
            type="text"
            placeholder="Start Chat..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full bg-white/5 border-0 border-b-2 border-[#0054d6]/50 text-white placeholder-slate-500 px-4 py-6 text-sm focus-visible:outline-none focus-visible:ring-0 focus-visible:border-[#00D4FF] focus:border-[#00D4FF] transition-colors pr-12 rounded-sm shadow-none"
            aria-label="Chat message input"
            autoComplete="off"
            disabled={!isConnected}
          />
          <button 
            type="submit"
            aria-label="Send message"
            id="chat-submit"
            disabled={inputValue.trim().length === 0 || !isConnected}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#0054d6] hover:text-[#00D4FF] transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
