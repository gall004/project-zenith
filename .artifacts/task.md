# Task: Backend FastAPI Scaffold
## Objective
Initialize the Project Zenith backend architecture with FastAPI, Pipecat, and LiveKit Server SDK, enforcing strict async purity, CORS middleware ordering, and standard REST versioning.

## P0 — Must Have

### US-01: FastAPI Initialization & Dependencies
- [x] **Given** the `backend/` directory is empty,
  **When** the engineer initializes the Python 3.11+ environment,
  **Then** a clean environment is created using `uv` with `fastapi`, `uvicorn`, `pipecat-ai`, `pydantic`, `pydantic-settings`, and `livekit-server-sdk` installed and securely pinned in a `uv.lock` file.

### US-02: Strict Directory Structure
- [x] **Given** the Python environment is set up,
  **When** the engineer creates the core application folders,
  **Then** the project contains the exact directories mandated by `backend-engineering.md`: `app/api/`, `app/services/`, `app/pipelines/`, `app/core/`, and `app/models/`.

### US-03: CORS Configured
- [x] **Given** the FastAPI application is initialized in `app/main.py`,
  **When** backend middleware is configured,
  **Then** CORS middleware is configured as the outermost layer (first to load), accepting requests from the frontend (`NEXT_PUBLIC_API_BASE_URL` or `localhost:3000`), ensuring WebRTC pipeline initialization won't fail due to preflight OPTIONS blocks.

### US-04: API Envelope and Standard Response
- [x] **Given** the `api-contract.md` rules mandate a standard response envelope,
  **When** the engineer sets up the `/api/v1/health` endpoint,
  **Then** the response must be structured precisely as `{ "data": { ... }, "error": null, "meta": { "timestamp": "...", "request_id": "..." } }`.

### US-05: Health Check Endpoint
- [x] **Given** production infrastructure requires liveness and readiness checks,
  **When** a client requests `GET /api/v1/health`,
  **Then** the server responds with a `200 OK` (if dependencies are connected) or `503 Service Unavailable` containing service name, version, uptime, and dependency connectivity status (Redis/LiveKit mock or real status).

## P1 — Should Have

### US-06: Pytest and TDD Setup
- [x] **Given** the backend scaffold is complete,
  **When** the engineer configures the test suite,
  **Then** `pytest` and `httpx` are installed, and a basic test verifying the `/api/v1/health` endpoint exists in and passes with zero failures.
