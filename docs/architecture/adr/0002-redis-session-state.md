# ADR-0002: Backend-Owned Session State via Redis

## Status
Accepted

## Context
Project Zenith's session state (user identity, room assignment, multimodal escalation state, escalation data, and chat transcript) was previously stored entirely in the browser's `sessionStorage`. This approach was adopted during the PoC sprint for speed but introduced critical fragility:

1. **Data loss on refresh**: A page refresh during a complex multimodal session would drop the escalation state and multimodal context, requiring the user to restart their conversation.
2. **No multi-device continuity**: State was locked to a single browser tab.
3. **No horizontal scaling**: In a multi-worker deployment, the in-memory `ConnectionManager` and session state could not be shared across workers.
4. **Backend blindness**: The backend had no awareness of session state — it couldn't make decisions about pipeline lifecycle based on session status, only on in-memory WebSocket connection counts.

The product requirement is enterprise-grade session resilience: a user should be able to refresh their browser and seamlessly resume their exact conversation context, including multimodal and escalation state.

## Decision
Introduce **Redis** (via `redis[hiredis]` for async Python with C-accelerated parsing) as the backend-authoritative session state store:

- **Session state**: Persisted as JSON at `session:{room_name}` with a 24-hour TTL.
- **Chat transcript**: Persisted as a Redis list at `transcript:{room_name}`, TTL-aligned with the session.
- **Write-before-emit pattern**: All state mutations (multimodal escalation, session end) are written to Redis *before* the corresponding WebSocket event is emitted, ensuring a simultaneous page refresh always finds current state.
- **Frontend hydration**: The frontend hydrates from `GET /api/v1/sessions/{room_name}` on mount. The only client-side persistence is a lightweight cookie (`zenith_session_room`) used as a session handle.
- **Graceful degradation**: If Redis is unavailable at startup, the backend logs a warning and continues operating in degraded mode. The health endpoint reports Redis status.

### Key API Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/v1/sessions` | Create or resume a session |
| `GET` | `/api/v1/sessions/{room_name}` | Hydrate full session state |
| `GET` | `/api/v1/sessions/{room_name}/transcript` | Retrieve chat transcript |
| `DELETE` | `/api/v1/sessions/{room_name}` | End session, purge state |

### Infrastructure
- **Local dev**: `redis://localhost:6379/0` (Docker or native)
- **Production (GCP)**: Memorystore for Redis — managed, HA, zero-ops
- **Connection**: Async singleton pool with 20 max connections, 5s connect/socket timeout

## Alternatives Considered

### PostgreSQL (asyncpg)
Rejected. Session state is ephemeral with a finite lifecycle — not durable business data. PostgreSQL adds schema migrations, connection pooling complexity, and doesn't have native TTL. The key-value access pattern (`session:{room_name}`) is a textbook Redis use case.

### Google Cloud Firestore
Rejected. 10–50ms read latency vs Redis's sub-1ms. Unacceptable for a hydration call that fires on every page refresh in a real-time CX platform.

### Memcached
Rejected. Lacks data structures (lists for transcripts, hashes for session state). No persistence options. No pub/sub for future horizontal scaling.

### Keep sessionStorage (frontend-only)
Rejected. This was the status quo. It doesn't survive backend restarts, can't scale past a single process, and created persistent hydration bugs documented in conversation `c12b9059`.

## Consequences

### Positive
- **Session resilience**: Users can refresh their browser and resume their exact conversation context.
- **Backend authority**: The backend owns all session state, enabling intelligent pipeline lifecycle decisions.
- **Horizontal scaling path**: Redis pub/sub can replace the in-memory `ConnectionManager` for cross-worker WebSocket broadcasting in a future sprint.
- **Automatic cleanup**: Redis TTL auto-evicts abandoned sessions without cron jobs.
- **Observability**: Health endpoint reports `active_sessions` count and Redis connectivity.

### Trade-offs Absorbed
- **New infrastructure dependency**: Redis must be running for full functionality. Mitigated by graceful degradation (backend starts without Redis, reports degraded health).
- **Additional network hop**: Every message now appends to Redis. Mitigated by hiredis C parser and sub-1ms Redis latency.
- **Identity lookup via SCAN**: `get_session_by_identity()` uses Redis SCAN which is O(N) over session keys. Acceptable for <10K concurrent users. For >100K, add a secondary index (`identity:{id}` → `room_name`).
