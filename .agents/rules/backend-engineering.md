---
description: Backend AI Orchestration Governance Rule (Python/FastAPI)
globs: backend/**/*
---

# Backend AI Orchestration Governance Rule

When operating within the `backend` context, you assume the role of the **Lead AI Pipeline Engineer**. Your primary focus is building robust, horizontally scalable, real-time voice infrastructure.

## 1. Core Tech Stack
- **Languages/Frameworks:** Python, FastAPI
- **WebRTC/Pipeline Engine:** Pipecat, LiveKit Server SDK
- **AI Models:** Gemini Enterprise for CX (GECX)

## 2. Engineering Standards & Best Practices
### Async Purity (Zero Blocking)
Pipecat and LiveKit are highly sensitive real-time components that rely entirely on strict async event loops. 
- **MANDATORY:** Never block the main thread with synchronous operations. Standard blocking I/O (like `requests`, `time.sleep()`, or synchronous database drivers) is strictly forbidden. 
- You must exclusively utilize async libraries (`aiohttp`, `asyncio`, async DB clients) to guarantee sub-500ms audio pipeline integrity.

### Fail-Fast Defensive Design
Do not allow malformed data to propagate to the model or WebRTC instances.
- **MANDATORY:** FastAPI boundaries must actively use strict Pydantic validation on all incoming data schemas. 
- Invalid requests must be rejected immediately via an HTTP 422 (Unprocessable Entity).

### Guaranteed Statelessness
In order to handle large-scale concurrency and gracefully survive node failures in LiveKit, the backend "Smart Proxy" must be architecturally stateless.
- **FORBIDDEN:** Do not cache state, conversation history, or session variables directly in local application memory (e.g., Python dicts acting as state stores).
- **MANDATORY:** Context and state data must be delegated to Redis via async clients perfectly enabling horizontal Pipecat scaling.

## 3. Project Structure Convention
Maintain a strict layered architecture to prevent monolithic entanglement and enforce separation of concerns.
- **`app/api/`** — Route handlers (FastAPI routers). Thin controllers that validate input and delegate to services.
- **`app/services/`** — Business logic layer. All domain operations, orchestration, and external API calls live here.
- **`app/models/`** — Pydantic schemas for request/response validation and internal data transfer objects.
- **`app/core/`** — Shared infrastructure: Pydantic `BaseSettings` configuration, dependency injection providers, logging setup.
- **`app/pipelines/`** — Pipecat pipeline definitions and LiveKit room event handlers.
- **FORBIDDEN:** Do not dump all application logic into a single `main.py`. Route handlers must never contain business logic directly — they delegate to the service layer.

## 4. Dependency Injection
- **MANDATORY:** Use FastAPI's `Depends()` mechanism for all service, database session, and configuration injection into route handlers.
- **FORBIDDEN:** Do not instantiate service classes or create database connections directly inside route handler function bodies. This makes unit testing impossible and violates inversion of control.

## 5. Health Check Endpoint
Production infrastructure (Kubernetes, Cloud Run, load balancers) requires standardized health probes.
- **MANDATORY:** Expose a `GET /api/v1/health` endpoint that returns `200 OK` with a structured JSON response including: service name, version, uptime, and dependency connectivity status (Redis reachable, LiveKit server reachable).
- **Readiness vs. Liveness:** If the application depends on external services (Redis, LiveKit) to function, the health endpoint must differentiate between "alive but not ready" (dependencies down) and "fully healthy" (all dependencies connected). Return `503 Service Unavailable` if critical dependencies are unreachable.

## 6. State & Context Retrieval
Backend logic design and execution must be driven by strict PM blueprints, not improvisational chat history.
- **MANDATORY PREREQUISITE:** Before writing, editing, or scaffolding any backend application code or pipeline logic, you MUST first aggressively read and digest `.artifacts/task.md`. 
- **SINGLE SOURCE OF TRUTH:** You are strictly forbidden from hallucinating software requirements or relying exclusively on conversational chat history to assume what needs to be built. The Markdown artifact defines the exact BDD requirements and system scope; if it is not in `.artifacts/task.md`, it does not exist.

## 7. Database & Migration Governance
Schema changes must be versioned, reversible, and automated — never applied manually or via raw SQL scripts.
- **Migration Tool:** Use Alembic for all database schema migrations, auto-generating from SQLAlchemy models. Never create hand-written SQL migration files.
- **Descriptive Names:** Migration files must use descriptive revision messages (e.g., `alembic revision --autogenerate -m "add_rooms_table"`). Generic names like `migration_001` or `update` are forbidden.
- **Rollback Capability:** Every migration must include a corresponding `downgrade()` function that cleanly reverts the schema change. Irreversible migrations must be flagged with an inline comment explaining why rollback is impossible.
- **No Raw SQL in Application Code:** Access the database exclusively through the async SQLAlchemy session and ORM methods. Never use raw `execute()` with string interpolation — this is an injection vector.

## 8. Middleware Ordering
FastAPI middleware stacking order affects security and observability. Incorrect ordering creates silent vulnerabilities.
- **Canonical Order** (outermost to innermost):
  1. **CORS** — Must be outermost to handle preflight requests before any other processing.
  2. **Request ID Injection** — Attach a unique `X-Request-ID` header for distributed tracing.
  3. **Rate Limiting** — Throttle before expensive authentication or business logic.
  4. **Authentication / Authorization** — Validate credentials before route handlers execute.
  5. **Logging / Timing** — Record request duration and metadata for observability.
  6. **Route Handlers** — Innermost layer.
- **FORBIDDEN:** Never place CORS middleware after authentication — preflight `OPTIONS` requests will fail silently.

## 9. API Response Time Budgets
Frontend performance budgets are meaningless if the backend responds slowly. Enforce engineering-level SLAs.
- **Standard CRUD Operations:** Target < 200ms P95 response time for read/write endpoint round-trips.
- **Pipeline Initialization:** LiveKit room creation and Pipecat pipeline startup may target < 500ms given handshake overhead.
- **Long-Running Operations:** Any operation expected to exceed 1 second must be converted to an asynchronous job pattern: return `202 Accepted` with a job ID, then poll or receive a webhook notification upon completion.
- **Database Query Awareness:** If a single endpoint requires more than 3 database queries, evaluate whether the data model should be denormalized or the queries batched. N+1 query patterns are forbidden.
