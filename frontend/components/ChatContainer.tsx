/**
 * ChatContainer — Text chat UI component (US-07, US-08, US-09)
 *
 * Renders a message list with auto-scroll, text input, and submit.
 * Wired to the useZenithSocket hook for real-time messaging.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { useZenithSocket } from "@/hooks/useZenithSocket";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
      className="inline-flex items-center gap-2 text-xs text-slate-400 font-label tracking-wide uppercase"
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
  onEndSession?: () => void;
  children?: React.ReactNode;
}

export function ChatContainer({
  roomName,
  onMultimodalIntercept,
  onSessionEvent,
  onEndSession,
  children,
}: ChatContainerProps): React.JSX.Element {
  const {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  } = useZenithSocket(roomName);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("zenith_messages");
      if (saved) {
        try { return JSON.parse(saved); } catch { }
      }
    }
    return [];
  });
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
      // removed redundant eslint directive
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

  // Sync state cleanly when switching context
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("zenith_messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Removed redundant effect because VoiceSessionClient mounts this with key={roomName}

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
      <div className="px-2 flex justify-between items-center mb-4">
        <ConnectionStatusBadge
          status={connectionStatus}
          attempt={reconnectAttempt}
        />
        {onEndSession && messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <button
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-full font-medium transition-colors border border-red-500/20"
                  aria-label="End current session"
                >
                  End Session
                </button>
              }
            />
            <AlertDialogContent className="bg-[#2c3134] text-white border-white/10 sm:max-w-[425px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline text-lg">End Session?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400 text-base">
                  Are you sure you want to end your session with Zenith? This will clear your chat history and sever the secure connection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 flex gap-3 sm:gap-0">
                <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white sm:mr-2">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onEndSession}
                  className="bg-red-500 hover:bg-red-600 text-white border-none"
                >
                  End Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-4 pr-3 custom-scrollbar min-h-0 flex flex-col"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 flex-1 text-center p-4">
            <span className="material-symbols-outlined text-4xl text-slate-600 mb-2" style={{fontVariationSettings: "'FILL' 0"}}>forum</span>
            <p className="text-sm text-slate-400 font-body">How can I assist you today?</p>
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
      <div className="mt-4 pb-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={`relative w-full flex items-center bg-[#1c2022] border-2 border-white/10 rounded-[32px] pl-5 pr-2 py-2 transition-all shadow-md ${!isConnected ? "opacity-70 grayscale" : "focus-within:border-[#00D4FF]/70 focus-within:shadow-[0_0_15px_rgba(0,212,255,0.2)]"}`}
        >
          <input
            ref={inputRef}
            id="chat-input"
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 bg-transparent border-none text-white placeholder-slate-400 outline-none ring-0 focus:ring-0 px-0 h-10 text-sm disabled:cursor-not-allowed"
            aria-label="Chat message input"
            autoComplete="off"
            disabled={!isConnected}
          />
          <button 
            type="submit"
            aria-label="Send message"
            id="chat-submit"
            disabled={inputValue.trim().length === 0 || !isConnected}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${!isConnected || inputValue.trim().length === 0 ? "bg-white/10 text-white/30" : "bg-[#00D4FF] text-black hover:bg-[#00D4FF]/90 shadow-[0_0_10px_rgba(0,212,255,0.4)]"}`}
          >
            <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>arrow_upward</span>
          </button>
        </form>
      </div>
    </div>
  );
}
