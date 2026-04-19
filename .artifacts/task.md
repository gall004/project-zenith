# Task: Sprint 3 — Backend-Owned Session State via Redis

## Objective
Replace the fragile client-side `sessionStorage` pattern with a backend-authoritative session state layer backed by Redis. All session metadata (identity, room assignment, multimodal state, escalation state, chat transcript) is persisted server-side. The frontend becomes a thin renderer that hydrates from a REST session endpoint on mount—not from browser storage. This eliminates data loss on refresh, enables multi-device continuity, and positions the platform for horizontal scaling.

## Scope Boundary
This sprint covers **Session State Migration** and the **Redis Integration Layer**. It touches both the backend (new Redis service, new session model, updated WebSocket handlers, new REST endpoints) and the frontend (removal of `sessionStorage`, new hydration-from-API pattern). It does *not* change the Pipecat pipeline internals, LiveKit transport layer, or CES agent routing logic.

---

## P0 — Must Have

### US-01: Redis Connection Service
- [ ] **Given** the `REDIS_URL` environment variable is correctly set in `backend/app/core/config.py`,
  **When** the FastAPI application starts,
  **Then** a shared `aioredis` (redis-py async) client pool is initialized as a singleton, exposed via a `get_redis()` dependency. Health checks at `/api/v1/health` include a `redis: "ok"` field confirming connectivity. Startup fails fast with a clear log if Redis is unreachable.

### US-02: Backend Session Model (Pydantic + Redis Schema)
- [ ] **Given** session state must survive backend restarts and browser refreshes,
  **When** a new session is created,
  **Then** a `SessionState` Pydantic model is written to Redis under the key `session:{room_name}` with a configurable TTL (default: 24h). The model contains: `room_name`, `identity`, `status` (active | escalated | ended), `multimodal_event` (nullable JSON), `escalation_data` (nullable JSON), `created_at`, `updated_at`.

### US-03: Session Creation Endpoint (POST /api/v1/sessions)
- [ ] **Given** a user opens the Zenith drawer for the first time (no existing session),
  **When** the frontend POSTs to `/api/v1/sessions` with an optional `identity`,
  **Then** the backend generates a deterministic `room_name`, persists a new `SessionState` to Redis, and returns `{ room_name, identity, status }`. If a session already exists for that identity (resumption), it returns the existing session state instead of creating a new one.

### US-04: Session Hydration Endpoint (GET /api/v1/sessions/{room_name})
- [ ] **Given** the browser has refreshed or the user returns to the page,
  **When** the frontend GETs `/api/v1/sessions/{room_name}`,
  **Then** the backend returns the full `SessionState` from Redis, including `multimodal_event`, `escalation_data`, and `status`. If the session has expired or doesn't exist, a `404` is returned. The frontend uses this single response to restore the complete UI state without any `sessionStorage` reads.

### US-05: Chat Transcript Persistence (Redis List)
- [ ] **Given** the user sends or receives messages during a session,
  **When** a `chat_message` is sent or an `agent_response` is received,
  **Then** each message is appended to a Redis list at `transcript:{room_name}` with the message JSON (including `id`, `text`, `sender`, `timestamp`). The frontend hydrates the full transcript on mount via `GET /api/v1/sessions/{room_name}/transcript`.

### US-06: WebSocket State Sync on Multimodal Escalation
- [ ] **Given** the GECX agent fires a `request_visual_context` tool call,
  **When** the agent webhook handler processes the event,
  **Then** the handler updates `session:{room_name}` in Redis with the `multimodal_event` payload *before* dispatching the WebSocket event. This ensures the state survives a simultaneous browser refresh.

### US-07: WebSocket State Sync on Session Escalation
- [ ] **Given** the CES agent returns an `end_session` signal or the pipeline emits an `escalated` session event,
  **When** the backend processes the escalation,
  **Then** the backend updates the `SessionState` in Redis with `status: escalated` and the `escalation_data` payload *before* broadcasting the WebSocket event.

### US-08: Frontend Hydration from API (Remove sessionStorage)
- [ ] **Given** the VoiceSessionClient mounts (initial load or refresh),
  **When** the component initializes,
  **Then** the component calls `GET /api/v1/sessions/{room_name}` (room_name stored in a single cookie or URL param) to hydrate `identity`, `multimodalEvent`, `escalationData`, and `status`. All `sessionStorage.getItem` / `setItem` calls are removed from `VoiceSessionClient.tsx` and `ChatContainer.tsx`. A lightweight cookie (`zenith_session_room`) is the only client-side persistence, used solely as a session handle.

---

## P1 — Should Have

### US-09: Session DELETE Migrated to Redis Cleanup
- [ ] **Given** the user clicks "End Session",
  **When** `DELETE /api/v1/sessions/{room_name}` is called,
  **Then** the backend deletes `session:{room_name}` and `transcript:{room_name}` from Redis, stops any active Pipecat pipeline, and returns confirmation. The frontend clears the `zenith_session_room` cookie and resets to the clean state.

### US-10: Graceful Reconnect with Backend Awareness
- [ ] **Given** the WebSocket disconnects due to a page refresh,
  **When** the frontend re-establishes the WebSocket connection to the same `room_name`,
  **Then** the backend recognizes the room still has an active session in Redis (not just an in-memory connection map) and continues routing messages. The 30-second grace period timer in `ws.py` references the Redis session status rather than the in-memory connection count, preventing premature pipeline teardown.

---

## P2 — Nice to Have

### US-11: Session TTL Auto-Cleanup
- [ ] **Given** a session was abandoned by the user (browser closed, no explicit end),
  **When** the Redis TTL expires (24h default),
  **Then** the session key and transcript key are automatically evicted by Redis. No cron or cleanup task is needed.

### US-12: Health Endpoint Redis Metrics
- [ ] **Given** operations monitoring requires observability,
  **When** `GET /api/v1/health` is called,
  **Then** the response includes `active_sessions` count (KEYS count from Redis, or a maintained counter) and `redis_latency_ms` for SLA monitoring.
