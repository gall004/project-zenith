# Task: Sprint 2 — Pipecat Smart Proxy Pipeline & Gemini Live API

## Objective
Establish the core multimodal intelligence routing layer by integrating the Pipecat pipeline with LiveKit and connecting it to the Gemini Multimodal Live API. This bridges the gap between raw WebRTC audio/video and the advanced GECX reasoning engine.

## Scope Boundary
This sprint covers **Workstream 3 (Pipecat Smart Proxy)** and **Workstream 4 (Gemini Live API)**. It directly connects the backend services to real-time streams. It does *not* cover webhook routing (Sprint 3) or mobile UI polish (Sprint 4).

---

## P0 — Must Have

### US-01: Pipecat Pipeline Scaffold & LiveKit Subscription
- [x] **Given** the LiveKit Server SDK is configured securely,
  **When** an active voice session is initiated in the `/voice-session` route,
  **Then** a `Pipecat` pipeline worker runs on the backend, subscribing to the LiveKit room as a server-side participant using the `LiveKitTransport` module, capable of ingesting the user's published tracks. 

### US-02: Gemini Live Service WSS Client
- [x] **Given** the Gemini Multimodal Live API accepts stateful WebSocket connections,
  **When** the Pipecat pipeline starts,
  **Then** the `GeminiLiveService` establishes a persistent, secure WSS connection to `generativelanguage.googleapis.com`. It correctly authenticates using `GEMINI_API_KEY` (or Application Default Credentials) and transmits the initial `BidiGenerateContent` setup frame containing the `gecx_agent` system instructions.

### US-03: Real-Time Audio Extraction & Forwarding
- [x] **Given** the user is speaking into the LiveKit audio track,
  **When** PCM audio frame buffers flow into the Pipecat pipeline,
  **Then** an audio extraction node batches the frames and forwards them over the Gemini Live WSS client as `realtimeInput` base64 payloads, adhering to a sub-500ms latency budget.

### US-04: Video Frame Sampling
- [x] **Given** the multimodal intercept is active and the user's camera is streaming,
  **When** video frames flow into the Pipecat pipeline,
  **Then** a downsampling node captures frames at approximately 1 FPS and forwards them to the Gemini Live WSS client as `realtimeInput` payloads to provide visual context without flooding the network.

### US-05: Gemini Audio Response Piping
- [x] **Given** Gemini generates an audio-modality response,
  **When** the WSS client receives raw base64 PCM audio chunks from Gemini,
  **Then** those chunks are immediately piped back through Pipecat into the LiveKit room as a published server audio track so the user hears the virtual agent speaking with minimal buffering.

### US-06: Text Response Routing
- [x] **Given** Gemini generates a text-modality response,
  **When** the WSS client receives a text content chunk,
  **Then** the text is appended and routed to the frontend WebSocket event bus via the `ConnectionManager` as an `agent_response` event, replacing the Sprint 1 hardcoded echo handler.

### US-07: Tool Call Intercept (Visual Context)
- [x] **Given** the system instructions define the `request_visual_context` tool,
  **When** Gemini emits a tool call requesting visual context,
  **Then** the `GeminiLiveService` intercepts the tool call, sends a mock success response back to Gemini to acknowledge receipt, and fires an `enable_multimodal_input` event over the WebSocket event bus to flip the frontend camera on.

---

## P1 — Should Have

### US-08: Automatic Pipeline Lifecycle Management
- [x] **Given** backend resources are finite,
  **When** the user disconnects from the LiveKit room or closes the browser,
  **Then** the corresponding Pipecat pipeline automatically terminates, closes the Gemini WSS connection gracefully, and releases all buffer memory without hanging tasks.

### US-09: Environment Variables Configuration
- [x] **Given** seamless deployment across dev/stage/prod is required,
  **When** the backend initializes,
  **Then** `GEMINI_API_KEY` and vertex connection settings are robustly validated in `backend/app/core/config.py`, failing fast with clear logged errors if they are missing.

---

## P2 — Nice to Have

### US-10: Human Escalation (end_session) Tool Stub
- [x] **Given** the virtual agent cannot resolve a customer query,
  **When** Gemini emits an `end_session` tool call,
  **Then** the backend logs the escalation trace and broadcasts a `session_event` payload containing `status: escalated` to the frontend, gracefully closing the `LiveKitTransport`.
