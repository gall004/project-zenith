/**
 * ChatContainer — Enterprise-grade text chat UI component (US-07, US-08, US-09)
 *
 * Features: message grouping, timestamps, avatars, copy-to-clipboard,
 * sender labels, mic badge for voice transcriptions, typing indicator,
 * drag-and-drop attachments, and auto-scroll.
 */

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { fetchTranscript } from "@/lib/api/sessions";

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
  AttachmentPayload,
} from "@/types/websocket";

interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: string;
  attachments?: AttachmentPayload[];
}

/** Group of consecutive messages from the same sender. */
interface MessageGroup {
  sender: "user" | "agent";
  messages: ChatMessage[];
}

const SCROLL_THRESHOLD_PX = 100;

/* ─── Helpers ───────────────────────────────────────────────── */

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const msg of messages) {
    const last = groups[groups.length - 1];
    if (last && last.sender === msg.sender) {
      last.messages.push(msg);
    } else {
      groups.push({ sender: msg.sender, messages: [msg] });
    }
  }
  return groups;
}

/* ─── Sub-components ────────────────────────────────────────── */

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
      dotColor: "bg-primary",
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

  if (status === "connected") return null;

  return (
    <div
      className="inline-flex items-center gap-2 text-xs text-secondary font-label tracking-wide uppercase bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${dotColor} shadow-sm`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  );
}

function SenderAvatar({ sender }: { sender: "user" | "agent" }): React.JSX.Element {
  if (sender === "agent") {
    return (
      <div className="w-8 h-8 rounded-full overflow-hidden border border-[#00D4FF]/20 shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.15)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzgUdavKeju415VcsW9QLzNVWs7ACDrxXkmdS86pWHWA7r-FfitJ83dzmzHz5QSt9nYQjg20LpbNPGG-D3Flxh9CBterzvyHzbsQwQidUEWGcOo41QnuYg-QBDG5CfDgS7AcQ-YIBHDDVmhYXKNqXaj4jefFMv04J9w5Cf5MEagAXKVHmxuy0Ey72EEXb24_M1ud4yuJoDLyeRyjupnhyB4wYk-QqVMhUBjIFvi0Y7cB0GrN85qEaGBdKf1lTBAsIhS3-lokXwtCJk"
          alt="Zenith"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-surface-container border border-outline-variant flex items-center justify-center shrink-0 shadow-sm">
      <span
        className="material-symbols-outlined text-[16px] text-secondary"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        person
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API may not be available */
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200 p-1 rounded hover:bg-surface-container text-secondary hover:text-primary cursor-pointer ${copied ? "text-green-600 hover:text-green-600" : ""}`}
      aria-label="Copy message"
      title="Copy to clipboard"
    >
      <span
        className="material-symbols-outlined text-[14px]"
        style={{ fontVariationSettings: "'FILL' 0" }}
      >
        {copied ? "check" : "content_copy"}
      </span>
    </button>
  );
}

function MessageBubble({
  message,
  isFirst,
  isLast,
}: {
  message: ChatMessage;
  isFirst: boolean;
  isLast: boolean;
}): React.JSX.Element {
  const isUser = message.sender === "user";
  const isVoice = message.text.startsWith("🎙️");
  const displayText = isVoice ? message.text.replace(/^🎙️\s*/, "") : message.text;

  return (
    <div className={`group/msg relative ${isFirst ? "" : "mt-1"}`}>
      <div
        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          isUser
            ? `bg-sky-50 text-sky-900 border border-sky-200/60 ${isFirst ? "rounded-tr-2xl" : "rounded-tr-lg"} ${isLast ? "rounded-br-sm" : "rounded-br-lg"}`
            : `bg-surface-container border border-outline-variant text-on-surface ${isFirst ? "rounded-tl-2xl" : "rounded-tl-lg"} ${isLast ? "rounded-bl-sm" : "rounded-bl-lg"}`
        }`}
      >
        {isVoice && (
          <span className="inline-flex items-center gap-1 text-[11px] text-sky-600 font-bold uppercase tracking-wider mr-2 align-middle">
            <span
              className="material-symbols-outlined text-[13px] text-sky-500"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              mic
            </span>
            voice
          </span>
        )}
        {message.attachments?.map((att, i) => (
          <img
            key={i}
            src={`data:${att.mime_type};base64,${att.data}`}
            alt="Attachment"
            className="w-full max-w-sm rounded-lg mb-2 object-contain"
          />
        ))}
        {displayText}
      </div>

      {/* Footer: timestamp on last msg, copy on every agent msg */}
      <div className={`flex items-center gap-2 mt-1 min-h-[18px] ${
        isUser ? "justify-end" : "justify-start"
      }`}>
        {isLast && (
          <span className="text-[10px] text-secondary font-mono tracking-tight">
            {formatTimestamp(message.timestamp)}
          </span>
        )}
        {!isUser && <CopyButton text={displayText} />}
      </div>
    </div>
  );
}



function MessageGroupView({
  group,
}: {
  group: MessageGroup;
}): React.JSX.Element {
  const isUser = group.sender === "user";

  return (
    <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Sender label — sits above the avatar+bubbles row */}
      <div className={`mb-1.5 ${isUser ? "text-right pr-11" : "pl-11"}`}>
        <span className={`text-[11px] font-bold uppercase tracking-wider ${
          isUser ? "text-sky-600" : "text-secondary"
        }`}>
          {isUser ? "You" : "Zenith"}
        </span>
      </div>

      {/* Avatar + bubbles row */}
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar — top-aligned with first bubble */}
        <div className="shrink-0">
          <SenderAvatar sender={group.sender} />
        </div>

        {/* Messages column */}
        <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
          {group.messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isFirst={i === 0}
              isLast={i === group.messages.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator(): React.JSX.Element {
  return (
    <div className="mb-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-1.5 pl-11">
        <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
          Zenith
        </span>
      </div>
      <div className="flex gap-3">
        <div className="shrink-0">
          <SenderAvatar sender="agent" />
        </div>
        <div className="bg-surface-container border border-outline-variant shadow-sm rounded-2xl rounded-tl-lg rounded-bl-sm px-4 py-3">
          <div className="flex gap-1.5" aria-label="Agent is typing">
            {[0, 1, 2].map((dotIndex) => (
              <span
                key={dotIndex}
                className="inline-block h-1.5 w-1.5 rounded-full bg-secondary motion-safe:animate-bounce"
                style={{
                  animationDelay: `${dotIndex * 150}ms`,
                  animationDuration: "1s",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────── */

export interface ChatContainerProps {
  roomName: string;
  onMultimodalIntercept?: (event: EnableMultimodalInputEvent) => void;
  onSessionEvent?: (event: SessionEvent) => void;
  onEndSession?: () => void;
  onUserInteraction?: () => void;
  children?: React.ReactNode;
  maxAttachmentSizeMB?: number;
  allowedAttachmentTypes?: string[];
}

export function ChatContainer({
  roomName,
  onMultimodalIntercept,
  onSessionEvent,
  onEndSession,
  onUserInteraction,
  children,
  maxAttachmentSizeMB = process.env.NEXT_PUBLIC_MAX_ATTACHMENT_SIZE_MB ? Number(process.env.NEXT_PUBLIC_MAX_ATTACHMENT_SIZE_MB) : 5,
  allowedAttachmentTypes = process.env.NEXT_PUBLIC_ALLOWED_ATTACHMENT_TYPES ? process.env.NEXT_PUBLIC_ALLOWED_ATTACHMENT_TYPES.split(",") : ["image/jpeg", "image/png", "image/webp", "image/gif"],
}: ChatContainerProps): React.JSX.Element {
  const {
    isConnected,
    connectionStatus,
    reconnectAttempt,
    lastMessage,
    sendMessage,
  } = useZenithSocket(roomName);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Hydrate transcript from backend on mount (replaces sessionStorage)
  useEffect(() => {
    let cancelled = false;
    async function loadTranscript() {
      try {
        const transcript = await fetchTranscript(roomName);
        if (!cancelled && transcript.length > 0) {
          const hydrated: ChatMessage[] = transcript.map((msg) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender as "user" | "agent",
            timestamp: msg.timestamp,
          }));
          setMessages(hydrated);
          onUserInteraction?.();
        }
      } catch (err) {
        console.error("Failed to hydrate transcript", err);
      }
    }
    loadTranscript();
    return () => { cancelled = true; };
  }, [roomName]);
  const [inputValue, setInputValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);
  const [exportedTranscript, setExportedTranscript] = useState(false);

  const messageListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateMessageId = useCallback((): string => {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Compute grouped messages for rendering
  const messageGroups = useMemo(() => groupMessages(messages), [messages]);

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
      onUserInteraction?.();
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
      onUserInteraction?.();
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

  // Transcript persistence is now handled server-side (Redis).
  // No sessionStorage sync needed.

  // Removed redundant effect because VoiceSessionClient mounts this with key={roomName}

  const handleFile = useCallback((file: File) => {
    setFileError(null);
    if (!allowedAttachmentTypes.includes(file.type)) {
      setFileError(`Format not allowed. Use: ${allowedAttachmentTypes.map(t => t.split('/')[1]).join(', ')}`);
      return;
    }
    if (file.size > maxAttachmentSizeMB * 1024 * 1024) {
      setFileError(`File too large. Maximum size is ${maxAttachmentSizeMB}MB.`);
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setFilePreview(url);
  }, [allowedAttachmentTypes, maxAttachmentSizeMB]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
      setFilePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isConnected) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isConnected) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!isConnected) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          break;
        }
      }
    }
  };

  const handleSubmit = useCallback(async () => {
    const trimmed = inputValue.trim();
    if ((trimmed.length === 0 && !selectedFile) || !isConnected) return;

    let attachmentPayload: AttachmentPayload[] | undefined = undefined;

    if (selectedFile) {
      const buffer = await selectedFile.arrayBuffer();
      const base64Str = btoa(
        new Uint8Array(buffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );
      attachmentPayload = [{ mime_type: selectedFile.type, data: base64Str }];
    }

    // Optimistic UI — add user message immediately (US-09)
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      text: trimmed,
      sender: "user",
      timestamp: new Date().toISOString(),
      attachments: attachmentPayload,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsAwaitingResponse(true);
    onUserInteraction?.();

    // Send via WebSocket
    const event: WebSocketEvent = {
      type: "chat_message",
      payload: { text: trimmed, sender: "user", attachments: attachmentPayload },
      timestamp: userMessage.timestamp,
    };
    sendMessage(event);

    // Clear input and retain focus
    setInputValue("");
    removeFile();
    inputRef.current?.focus();
  }, [inputValue, selectedFile, filePreview, isConnected, sendMessage, generateMessageId]);

  const handleSuggestedAction = useCallback((text: string) => {
    if (!isConnected) return;
    
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      text,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsAwaitingResponse(true);
    onUserInteraction?.();

    const event: WebSocketEvent = {
      type: "chat_message",
      payload: { text, sender: "user" },
      timestamp: userMessage.timestamp,
    };
    sendMessage(event);
  }, [isConnected, sendMessage, generateMessageId, onUserInteraction]);

  const handleCopyTranscript = useCallback(() => {
    try {
      const text = messages.map(m => `[${formatTimestamp(m.timestamp)}] ${m.sender === "user" ? "You" : "Zenith"}: ${m.text.replace(/^🎙️\s*/, "")}`).join("\n");
      navigator.clipboard.writeText(text);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    } catch {
      // Ignore clipboard failure silently
    }
  }, [messages]);

  const handleExportTranscript = useCallback(() => {
    try {
      const text = messages.map(m => `[${formatTimestamp(m.timestamp)}] ${m.sender === "user" ? "You" : "Zenith"}: ${m.text.replace(/^🎙️\s*/, "")}`).join("\n");
      const blob = new Blob([text], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zenith-transcript-${new Date().toISOString().split("T")[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setExportedTranscript(true);
      setTimeout(() => setExportedTranscript(false), 2000);
    } catch {
      // Ignore fallback issues silently
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full" aria-label="Chat">
      <div className="flex w-full justify-between items-center mb-4 min-h-[32px] px-2">
        <div className="shrink-0 flex items-center pl-1">
          <ConnectionStatusBadge
            status={connectionStatus}
            attempt={reconnectAttempt}
          />
        </div>
        
        {messages.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar justify-end flex-wrap sm:flex-nowrap bg-surface border border-outline shadow-sm rounded-2xl p-1.5">
            <button
               onClick={handleCopyTranscript}
               title="Copy Transcript to Clipboard"
               className={`px-3 py-2 rounded-[10px] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${copiedTranscript ? 'bg-green-500/10 text-green-700' : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'}`}
               aria-label="Copy Transcript"
            >
              <span className="material-symbols-outlined text-[16px] leading-[0]">{copiedTranscript ? "check" : "content_copy"}</span>
              <span className="text-[11px] font-bold tracking-wider uppercase hidden sm:block">Copy</span>
            </button>
            <div className="hidden sm:block w-px h-5 bg-outline-variant mx-0.5 shrink-0" />
            <button
               onClick={handleExportTranscript}
               title="Download Transcript File"
               className={`px-3 py-2 rounded-[10px] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${exportedTranscript ? 'bg-green-500/10 text-green-700' : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'}`}
               aria-label="Export Transcript"
            >
              <span className="material-symbols-outlined text-[16px] leading-[0]">{exportedTranscript ? "check" : "download"}</span>
              <span className="text-[11px] font-bold tracking-wider uppercase hidden sm:block">Export</span>
            </button>

            {onEndSession && (
              <>
                <div className="hidden sm:block w-px h-5 bg-outline-variant mx-0.5 shrink-0" />
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        className="px-3 py-2 rounded-[10px] bg-error/10 hover:bg-error text-error hover:text-on-error flex items-center justify-center gap-1.5 transition-all duration-300 shrink-0 cursor-pointer"
                        aria-label="End current session"
                        title="End Session"
                      >
                        <span className="material-symbols-outlined text-[16px] leading-[0]">power_settings_new</span>
                        <span className="text-[11px] font-bold tracking-wider uppercase hidden sm:block">End Session</span>
                      </button>
                    }
                  />
            <AlertDialogContent className="bg-surface-container-low text-on-surface border border-outline shadow-[0_0_50px_rgba(0,0,0,0.15)] sm:max-w-[425px]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-headline text-lg">End Session?</AlertDialogTitle>
                <AlertDialogDescription className="text-secondary text-base">
                  Are you sure you want to end your session with Zenith? This will clear your chat history and sever the secure connection.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 flex gap-3 sm:gap-0">
                <AlertDialogCancel className="bg-transparent border-outline-variant text-on-surface hover:bg-surface-container sm:mr-2">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onEndSession}
                  className="bg-error hover:bg-error/90 text-on-error border-none"
                >
                  End Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
              </AlertDialog>
              </>
            )}
          </div>
        )}
      </div>

      <div 
        className={`relative flex-1 min-h-0 flex flex-col transition-colors rounded-xl border-2 ${isDragging ? "border-[#00D4FF] bg-[#00D4FF]/5" : "border-transparent"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
        ref={messageListRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pr-3 custom-scrollbar min-h-0 flex flex-col"
        role="log"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-8 pb-4 flex-1 text-center px-4 w-full h-full min-h-[min(50vh,300px)]">
            <span className="material-symbols-outlined text-4xl text-primary mb-2" style={{fontVariationSettings: "'FILL' 0"}}>forum</span>
            <p className="text-sm text-secondary font-body mb-4">How can I assist you today?</p>
            
            <div className="w-full flex flex-wrap justify-center gap-2 mt-2 max-w-[95%] mx-auto">
              <button 
                onClick={() => handleSuggestedAction("I have an object here but I'm not sure what it is. Can you help me identify it?")}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant hover:border-primary rounded-full transition-all duration-200 text-xs text-on-surface flex items-center gap-1.5 group font-medium"
              >
                <span className="material-symbols-outlined text-[14px] text-primary group-hover:scale-110 transition-transform">visibility</span>
                Visual Context Demo
              </button>
              <button 
                onClick={() => handleSuggestedAction("I've been feeling a bit off today and I'm not sure why. Could you take a look at me and tell me how I'm coming across?")}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high border border-outline-variant hover:border-primary rounded-full transition-all duration-200 text-xs text-on-surface flex items-center gap-1.5 group font-medium"
              >
                <span className="material-symbols-outlined text-[14px] text-primary group-hover:scale-110 transition-transform">mood</span>
                Sentiment Analysis
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {messageGroups.map((group, gi) => (
              <MessageGroupView key={`group-${gi}-${group.messages[0].id}`} group={group} />
            ))}
          </div>
        )}
        {isAwaitingResponse && <TypingIndicator />}
        
        {/* Render LiveKitSession or escalation state inline here so it appears beneath/inside the chat flow */}
        {children}
        </div>

        {/* Scroll-to-bottom helper */}
        {!isNearBottom && messages.length > 0 && (
          <button
            onClick={() => {
              if (messageListRef.current) {
                const container = messageListRef.current;
                container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
              }
            }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-10 w-10 flex items-center justify-center bg-surface hover:bg-surface-container-low text-on-surface rounded-full shadow-xl border border-outline transition-all z-20 animate-in fade-in slide-in-from-bottom-2 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            aria-label="Scroll to bottom"
          >
            <span className="material-symbols-outlined text-[20px] leading-none block" style={{fontVariationSettings: "'wght' 300"}}>arrow_downward</span>
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="mt-4 pb-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={`relative flex flex-col bg-surface border border-outline-variant rounded-2xl p-2 transition-all shadow-sm ${!isConnected ? "opacity-70 grayscale pointer-events-none" : "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary"}`}
        >
          {fileError && (
            <div className="text-error text-xs px-2 pb-2 font-medium" role="alert">
              <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">error</span>
              {fileError}
            </div>
          )}

          {filePreview && (
            <div className="relative inline-block w-24 h-24 mx-2 mb-2 overflow-hidden bg-surface-container rounded-lg border border-outline-variant shrink-0">
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={removeFile}
                className="absolute top-1 right-1 w-6 h-6 bg-error rounded-full flex items-center justify-center text-on-error p-0 shadow-sm z-10"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
              <img
                src={filePreview}
                alt="File preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex items-center w-full">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              disabled={!isConnected}
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-2 bg-transparent text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">attach_file</span>
            </button>

            <input
              ref={inputRef}
              id="chat-input"
              type="text"
              placeholder="Type a message or paste an image..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={handlePaste}
              className="flex-1 bg-transparent border-none text-on-surface placeholder-secondary outline-none ring-0 focus:ring-0 px-2 h-10 text-sm disabled:cursor-not-allowed"
              aria-label="Chat message input"
              autoComplete="off"
              disabled={!isConnected}
            />
            
            <button 
              type="submit"
              aria-label="Send message"
              id="chat-submit"
              disabled={(inputValue.trim().length === 0 && !selectedFile) || !isConnected}
              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${!isConnected || (inputValue.trim().length === 0 && !selectedFile) ? "bg-surface-container text-secondary" : "bg-primary text-on-primary hover:bg-primary/90 shadow-md"}`}
            >
              <span className="material-symbols-outlined text-xl" style={{fontVariationSettings: "'FILL' 1"}}>arrow_upward</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
