---
description: Structured Error Handling & Logging Governance
globs: "**/*"
---

# Structured Error Handling & Logging Governance

When writing or modifying application logic, you must enforce rigorous, structured error handling patterns across both stacks. Silent failures, swallowed exceptions, and unstructured logging are existential threats to a real-time WebRTC system.

## 1. Exception Specificity
- **FORBIDDEN (Python):** Never use bare `except:` or `except Exception:` as a catch-all. Always catch the most specific exception class relevant to the operation (e.g., `except httpx.TimeoutException:`, `except livekit.ConnectError:`).
- **FORBIDDEN (TypeScript):** Never use empty `catch {}` blocks. Every `catch` must either handle, re-throw, or explicitly log the error with context.

## 2. Error Boundaries (Frontend)
- **MANDATORY:** Wrap top-level route layouts and critical UI sections (especially LiveKit video grids) in React Error Boundaries to prevent a single component crash from tearing down the entire application tree.
- **User-Facing Graceful Degradation:** Error boundaries must render a meaningful fallback UI, never a blank screen or raw stack trace.

## 3. Structured Logging
- **Backend:** Use structured logging libraries (e.g., `structlog`, `python-json-logger`) that emit JSON-formatted log lines. Every log entry must include: `timestamp`, `level`, `event`, and relevant `context` fields (e.g., `room_id`, `participant_id`).
- **Frontend:** Use a centralized logger utility instead of scattered `console.log()` statements. Production builds must never ship with raw `console.log()` calls.
- **FORBIDDEN:** Never log sensitive data (API keys, auth tokens, user PII) at any log level.

## 4. Fail-Fast Propagation
- **Do Not Suppress:** If an error cannot be meaningfully handled at the current layer, propagate it upward immediately. Do not catch an error just to silence it.
- **Context Enrichment:** When re-raising or propagating errors, always add contextual information (e.g., which pipeline stage failed, which room the error originated from) to aid in upstream diagnosis.

## 5. Transient Failure Resilience
Real-time systems must handle temporary failures without cascading collapse.
- **Retry Strategy:** For retryable operations (external API calls, Redis connections, LiveKit server handshakes), implement exponential backoff with jitter. Never use fixed-interval retries — they cause thundering herd effects.
- **Maximum Retries:** Set explicit retry limits (recommended: 3 attempts for API calls, 5 for infrastructure reconnections). After exhausting retries, fail loudly with a structured error — never retry indefinitely.
- **Circuit Breaker Pattern:** For critical downstream dependencies (Redis, LiveKit server, Gemini API), consider a circuit breaker that temporarily stops attempts to a failing service, allowing it time to recover. Log circuit state transitions (closed → open → half-open) for observability.
- **Idempotency Awareness:** Only retry operations that are safe to repeat. Never blindly retry state-mutating operations (POST, PUT, DELETE) without confirming idempotency.
