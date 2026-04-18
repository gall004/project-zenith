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
      dotColor: "bg-emerald-500",
      label: "Connected",
    },
    reconnecting: {
      dotColor: "bg-amber-500",
      label: `Reconnecting... (${attempt}/5)`,
    },
    disconnected: {
      dotColor: "bg-destructive",
      label: "Disconnected",
    },
  };

  const { dotColor, label } = statusConfig[status];

  return (
    <div
      className="inline-flex items-center gap-2 text-xs text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotColor}`}
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
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {message.text}
      </div>
    </div>
  );
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex gap-1" aria-label="Agent is typing">
          {[0, 1, 2].map((dotIndex) => (
            <span
              key={dotIndex}
              className="inline-block h-2 w-2 rounded-full bg-muted-foreground/50 motion-safe:animate-bounce"
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
  onMultimodalIntercept?: (event: EnableMultimodalInputEvent) => void;
}

export function ChatContainer({
  onMultimodalIntercept,
}: ChatContainerProps): React.JSX.Element {
  const {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  } = useZenithSocket();

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

    if (
      lastMessage.type === "enable_multimodal_input" &&
      onMultimodalIntercept
    ) {
      onMultimodalIntercept(
        lastMessage as EnableMultimodalInputEvent
      );
    }
  }, [lastMessage, generateMessageId, onMultimodalIntercept]);

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

  const handleKeyDown = useCallback(
    (keyEvent: React.KeyboardEvent<HTMLInputElement>) => {
      if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
        keyEvent.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Empty state (US-07 Three-State Rule)
  if (
    connectionStatus === "connected" &&
    messages.length === 0 &&
    !isAwaitingResponse
  ) {
    return (
      <section
        id="chat-container"
        className="flex flex-col h-full w-full"
        aria-label="Chat"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Zenith Chat</h2>
          <ConnectionStatusBadge
            status={connectionStatus}
            attempt={reconnectAttempt}
          />
        </header>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="rounded-full bg-muted p-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
              aria-hidden="true"
            >
              <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            </svg>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ask Zenith anything — type your question below.
          </p>
        </div>

        {/* Input area */}
        <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <form
            onSubmit={(formEvent) => {
              formEvent.preventDefault();
              handleSubmit();
            }}
            className="flex gap-2"
          >
            <Input
              ref={inputRef}
              id="chat-input"
              type="text"
              placeholder="Type a message..."
              value={inputValue}
              onChange={(changeEvent) =>
                setInputValue(changeEvent.target.value)
              }
              onKeyDown={handleKeyDown}
              className="flex-1 text-[16px]"
              aria-label="Chat message input"
              autoComplete="off"
            />
            <Button
              id="chat-submit"
              type="submit"
              disabled={
                inputValue.trim().length === 0 || !isConnected
              }
              className="min-w-11 min-h-11"
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m5 12 7-7 7 7" />
                <path d="M12 19V5" />
              </svg>
            </Button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section
      id="chat-container"
      className="flex flex-col h-full w-full"
      aria-label="Chat"
    >
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Zenith Chat</h2>
        <ConnectionStatusBadge
          status={connectionStatus}
          attempt={reconnectAttempt}
        />
      </header>

      {/* Message list */}
      <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        role="log"
        aria-live="polite"
        aria-label="Message history"
      >
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isAwaitingResponse && <TypingIndicator />}
      </div>

      {/* Scroll-to-bottom indicator */}
      {!isNearBottom && (
        <div className="flex justify-center py-1">
          <button
            type="button"
            onClick={() => {
              setIsNearBottom(true);
              const container = messageListRef.current;
              if (container?.lastElementChild) {
                container.lastElementChild.scrollIntoView({
                  behavior: "smooth",
                });
              }
            }}
            className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Scroll to latest messages"
          >
            ↓ New messages
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
        <form
          onSubmit={(formEvent) => {
            formEvent.preventDefault();
            handleSubmit();
          }}
          className="flex gap-2"
        >
          <Input
            ref={inputRef}
            id="chat-input"
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(changeEvent) =>
              setInputValue(changeEvent.target.value)
            }
            onKeyDown={handleKeyDown}
            className="flex-1 text-[16px]"
            aria-label="Chat message input"
            autoComplete="off"
          />
          <Button
            id="chat-submit"
            type="submit"
            disabled={
              inputValue.trim().length === 0 || !isConnected
            }
            className="min-w-11 min-h-11"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m5 12 7-7 7 7" />
              <path d="M12 19V5" />
            </svg>
          </Button>
        </form>
      </div>
    </section>
  );
}
