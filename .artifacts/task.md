# Task: Sprint 1 — Text Chat UI & WebSocket Event Bus

## Objective
Establish the real-time communication backbone and primary user interface for Project Zenith by building a bidirectional WebSocket event bus between the FastAPI backend and Next.js frontend, a production-grade text chat UI, and refactoring the existing multimodal intercept to consume live WebSocket signals instead of simulated browser events.

## Scope Boundary
This sprint covers **Workstream 1 (Text Chat UI)** and **Workstream 2 (WebSocket Event Bus)** from the v1.0 Roadmap. It does NOT include Pipecat pipeline integration, Gemini Multimodal Live API, or GECX agent webhook wiring — those are Sprint 2+ concerns.

---

## P0 — Must Have

### US-01: Backend WebSocket Endpoint (`/api/v1/ws`)
- [ ] **Given** the frontend requires a persistent, bidirectional real-time channel to the backend,
  **When** a client initiates a WebSocket upgrade request to `/api/v1/ws`,
  **Then** the FastAPI backend accepts the connection, assigns a unique `connection_id`, registers the client in the `ConnectionManager`, and holds the connection open for bidirectional message exchange. The endpoint must be fully async (zero blocking calls per `backend-engineering.md` §2) and the route handler must delegate all business logic to the service layer per `backend-engineering.md` §3.

### US-02: WebSocket Connection Manager Service
- [ ] **Given** multiple concurrent frontend clients may connect simultaneously,
  **When** a WebSocket connection is established, dropped, or explicitly closed,
  **Then** a `ConnectionManager` service in `backend/app/services/` tracks all active connections in memory for the PoC scope, provides `connect(websocket, connection_id)`, `disconnect(connection_id)`, and `send_to(connection_id, message)` methods, and ensures that abrupt client disconnections (network drop, browser close) are caught and cleaned up without raising unhandled exceptions or leaking resources per `error-handling.md` §4 and `qa-engineering.md` §2.

### US-03: WebSocket Message Protocol (Strict JSON Schema)
- [ ] **Given** the frontend and backend must exchange structured real-time events,
  **When** either party sends a WebSocket frame,
  **Then** the payload must conform to a strict Pydantic-validated JSON schema containing: `type` (string enum: `chat_message`, `agent_response`, `enable_multimodal_input`, `session_event`), `payload` (type-specific data object), and `timestamp` (ISO 8601 string) — per `api-contract.md` §4. Malformed messages must be rejected with a structured error frame (`type: "error"`) and must never crash the connection or propagate to downstream handlers per `error-handling.md` §1.

### US-04: Backend Chat Message Echo Handler
- [ ] **Given** the GECX agent integration is a Sprint 2 deliverable and not yet available,
  **When** the backend receives a `chat_message` event via WebSocket containing `{ "text": "..." }`,
  **Then** it echoes back a deterministic `agent_response` event containing `{ "text": "Echo: <original_message>", "sender": "agent" }` as a placeholder. This temporary echo handler must be clearly marked with an inline `# TODO(sprint-2): Replace with GECX agent session` comment and must be isolated in the service layer so it can be swapped without touching the route handler per `backend-engineering.md` §3.

### US-05: Frontend WebSocket Client Hook (`useZenithSocket`)
- [ ] **Given** the frontend requires a persistent, auto-reconnecting WebSocket connection to the backend,
  **When** the `useZenithSocket` custom hook mounts in a client component,
  **Then** it establishes a WebSocket connection to `${NEXT_PUBLIC_API_BASE_URL}/api/v1/ws` (using environment variables per `frontend-engineering.md` §8 — no hardcoded URLs), exposes typed state properties (`isConnected: boolean`, `lastMessage: WebSocketEvent | null`), a `sendMessage(event: WebSocketEvent): void` method, and implements exponential backoff reconnection with jitter (max 5 retries) per `error-handling.md` §5. The hook must declare an explicit TypeScript return type per `frontend-engineering.md` §9 and must reside in `frontend/hooks/useZenithSocket.ts` per naming convention §3.

### US-06: Frontend WebSocket Event Type Definitions
- [ ] **Given** the frontend must parse and construct WebSocket messages with strict type safety,
  **When** any component or hook references a WebSocket event,
  **Then** a dedicated type definition file at `frontend/types/websocket.ts` exports discriminated union types for `WebSocketEvent` covering `ChatMessageEvent`, `AgentResponseEvent`, `EnableMultimodalInputEvent`, and `SessionEvent` — each with a literal `type` discriminant field, a typed `payload`, and a `timestamp` string. The `any` type is banned per `frontend-engineering.md` §9. Type-only imports must use the `type` keyword.

### US-07: Chat Container Component (`ChatContainer`)
- [ ] **Given** the user's primary interaction with Project Zenith begins as text chat,
  **When** the `ChatContainer` client component renders within the `/voice-session` route,
  **Then** it displays a vertically scrolling message list showing both user and agent messages with visual distinction (alignment, background color using Shadcn theme tokens — no hardcoded hex per `frontend-engineering.md` §2), a fixed-bottom text input field using the Shadcn `Input` component, and a submit button using the Shadcn `Button` component. The component must implement Loading, Error, and Empty states per the Three-State Rule (`frontend-engineering.md` §11). The Empty state must display contextual guidance (e.g., "Ask Zenith anything — type your question below."). All interactive elements must have unique `id` attributes and be keyboard-navigable per `accessibility.md` §3.

### US-08: Chat Auto-Scroll Behavior
- [x] **Given** new messages arrive continuously during an active conversation,
  **When** a new `agent_response` or `chat_message` event appends to the message list,
  **Then** the chat container automatically scrolls to the bottom to reveal the latest message. If the user has manually scrolled upward (more than 100px from the bottom), auto-scroll must be suppressed to preserve their reading position. A "scroll to bottom" indicator must appear when new messages arrive while the user is scrolled up. The scroll behavior must use `scrollIntoView({ behavior: 'smooth' })` wrapped in a `@media (prefers-reduced-motion: no-preference)` guard per `accessibility.md` §5.

### US-09: Chat Message Wiring to WebSocket
- [x] **Given** the Chat UI and WebSocket hook are independent components,
  **When** the user types a message and submits (via Enter key or submit button click),
  **Then** the `ChatContainer` invokes `sendMessage()` from `useZenithSocket` with a fully structured `ChatMessageEvent`, the message immediately renders in the local message list as a user bubble (optimistic UI), and incoming `agent_response` events from the WebSocket are appended to the message list as agent bubbles. The input field clears after submission and retains focus for rapid conversational flow.

### US-10: Multimodal Intercept Refactor (WebSocket-Driven)
- [x] **Given** the existing `MultimodalInterceptHandler` in `LiveKitSession.tsx` listens for a simulated `window` event (`gecx_multimodal_intercept`) which is not a production-viable signal channel,
  **When** the component is refactored to consume the `useZenithSocket` hook,
  **Then** the handler reacts to incoming `enable_multimodal_input` WebSocket events (identified via the discriminated `type` field) by programmatically calling `room.localParticipant.setCameraEnabled(true)` — identical behavior to today but driven by the real WebSocket bus. The legacy `window.addEventListener('gecx_multimodal_intercept', ...)` code must be removed entirely. Error handling for camera permission denial must render a user-friendly fallback notification per `error-handling.md` §2.

---

## P1 — Should Have

### US-11: Chat UI Mobile Responsiveness
- [x] **Given** the executive summary mandates a mobile-first "zero-install" experience on Safari and Chrome,
  **When** the chat UI renders on a mobile viewport (≤ 640px width),
  **Then** the message list fills the available viewport height minus the input area, the input area is pinned to the bottom with safe area inset padding (`env(safe-area-inset-bottom)`), the text input uses a minimum `16px` font size (prevents iOS Safari auto-zoom on focus), and touch scrolling within the message list is smooth and bouncy (`-webkit-overflow-scrolling: touch`). The submit button must have a minimum touch target of 44×44px per WCAG 2.1 AA.

### US-12: WebSocket Connection Status Indicator
- [x] **Given** the user should understand whether their real-time connection is active,
  **When** the WebSocket connection state changes (connected, disconnected, reconnecting),
  **Then** a subtle status indicator in the chat header displays the current connection state using both color and text label (green dot + "Connected", amber dot + "Reconnecting...", red dot + "Disconnected") per `accessibility.md` §4 (never rely on color alone). During reconnection attempts, the indicator must show the current attempt count (e.g., "Reconnecting... (2/5)").

### US-13: Dual-Channel Input Persistence During WebRTC
- [x] **Given** the executive summary requires users to "speak or type while the camera is active",
  **When** the LiveKit WebRTC session is active and camera/mic are streaming,
  **Then** the `ChatContainer` text input remains visible and functional at the bottom of the `/voice-session` page, allowing the user to continue typing messages that are sent via WebSocket while simultaneously streaming audio/video via LiveKit. The chat UI must coexist with the LiveKit session view without layout conflicts.

---

## P2 — Nice to Have

### US-14: Message Timestamps in Chat UI
- [ ] **Given** users may review conversation history during a session,
  **When** messages are rendered in the chat list,
  **Then** each message displays a relative timestamp (e.g., "just now", "2m ago") derived from the `timestamp` field in the WebSocket event payload, formatted using a lightweight utility function in `frontend/lib/utils.ts`. Absolute timestamps must be available via hover/long-press tooltip using the Shadcn `Tooltip` component.

### US-15: Typing Indicator Animation
- [x] **Given** the agent may take variable time to respond,
  **When** the user sends a `chat_message` and is awaiting an `agent_response`,
  **Then** a subtle animated typing indicator (three pulsing dots) renders in the agent message area. The animation must honor `prefers-reduced-motion` per `accessibility.md` §5 — static "..." fallback for users who prefer reduced motion.
