# Task: LiveKit WebRTC Handshake and Multimodal Intercept
## Objective
Build the final vertical slice of Project Zenith, establishing the secure LiveKit connection handshake between the FastAPI backend and Next.js frontend, while scaffolding a programmatic intercept for the GECX agent's multimodal input.

## P0 — Must Have

### US-01: Backend Token Generation (`POST /api/v1/rooms/tokens`)
- [x] **Given** the frontend needs secure authorization to connect to a LiveKit room,
  **When** a valid client sends a `POST /api/v1/rooms/tokens` request to the FastAPI backend,
  **Then** the service uses the LiveKit Server SDK to generate an `AccessToken` and reliably returns it wrapped strictly within the `api-contract.md` standard JSON envelope (`{"data": {"token": "..."}, "error": null, "meta": {...}}`) with a P95 response under 200ms.

### US-02: Frontend API Client Fetcher
- [x] **Given** client-side LiveKit components require the secure access token,
  **When** the UI triggers WebRTC initialization,
  **Then** a rigidly typed async fetcher housed in `frontend/lib/api/` securely issues the POST request to the backend, parses the standard response envelope, and explicitly types the resulting data structure.

### US-03: LiveKit Room UI Client Component
- [x] **Given** a user navigates to the active voice session view,
  **When** the core Next.js client component mounts,
  **Then** it utilizes `@livekit/components-react` to fetch the token, requests microphone permissions, and connects to the room while achieving sub-500ms WebRTC connection latency, rendering visually robust Shadcn UI states for Loading, Error, and Empty per the `frontend-engineering.md` Three-State Rule.

## P1 — Should Have

### US-04: The Multimodal Intercept State Handler
- [x] **Given** the GECX agent may dynamically call the `request_visual_context` tool,
  **When** the frontend receives the simulated `enable_multimodal_input` payload from the websocket connection,
  **Then** a dedicated state handler systematically intercepts the signal and programmatically enables the local participant's camera video track without requiring redundant manual user interface clicks.
