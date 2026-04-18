# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [v1.0.0] - 2026-04-18

### Added
- Feature `feature/mobile-polish-and-escalation`: Handled the `end_session` human escalation trigger natively. Evaluates NGA variables (`session_escalated`, `ESCALATION_MESSAGE`, `PHONE_GATEWAY_TRANSFER`) extracted from the CES tool payload, passing them via WebSocket to gracefully transition the dual-channel UI into an actionable Escalation component containing `tel:` links, tearing down LiveKit securely.

### Changed
- Feature `feature/mobile-polish-and-escalation`: Migrated LiveKit Room configuration to explicitly pass `options={{ videoCaptureDefaults: { facingMode: "environment" } }}` natively ensuring rear-facing camera defaults for mobile CX context.
- Feature `feature/mobile-polish-and-escalation`: Locked App viewport scale to prevent mobile input zoom and mapped `viewport-fit: cover` to gracefully handle iOS safe-area-insets.
- Feature `feature/mobile-polish-and-escalation`: Rewired backend `health.py` probe to synchronously verify LiveKit HTTP endpoints.

## [v0.4.0] - 2026-04-18

### Changed
- Refactor `chore/ces-text-proxy`: Replaced raw Gemini Multimodal Live API (Pipecat text routing) with CES RunSession proxy (`ces.googleapis.com/v1beta`). Chat messages now route through `CESClient.send_text()` to the deployed GECX agent. Pipecat pipeline preserved for future media/voice routing sprint.
- Refactor `chore/ces-text-proxy`: Cleaned CES webhook (`POST /api/v1/agent/webhook`) — removed all legacy payload parsing, replaced with strict Pydantic `WebhookRequest`/`WebhookResponse` models.
- Refactor `chore/ces-text-proxy`: Renamed `GECX_AGENT_ID` to `CES_APP_ID` to match CES resource path hierarchy (`projects/X/locations/Y/apps/Z`).

### Added
- Feature `feature/multimodal-media-bridge`: Implemented dynamic Pipecat pipeline instantiation triggering natively off the `request_visual_context` webhook. Ensures graceful pipeline termination strictly bounded to the LiveKit room session closure.
- Feature `feature/multimodal-media-bridge`: Configured Gemini Live Multimodal Service to execute Persona Injection referencing the exact XML persona instruction file used by the text proxy, guaranteeing voice-mode consistency.
- `backend/tests/test_pipelines.py`: Restored and updated pipeline tests to verify asynchronous creation and proxy teardown.
- Feature `feature/ngrok-dev-tunnel`: Integrated ngrok as a third concurrent process in `npm run dev`. CES webhook callbacks now reach local FastAPI via a stable `NGROK_DOMAIN` tunnel — zero extra commands needed.
- `backend/app/services/ces_client.py`: Async CES RunSession client using ADC + `httpx` for zero-blocking API calls.
- `backend/tests/test_ces_client.py`: Unit tests for session path construction, response parsing (text, endSession, toolCalls), and API call structure.


## [v0.3.2] - 2026-04-18

### Fixed
- Bug Fix `fix/pipecat-transport-init`: Resolved backend `TypeError: LiveKitTransport.__init__() got an unexpected keyword argument` by conforming initialization to Pipecat 1.0.0 standards and enforcing isolated WebRTC access tokens between proxy agents and end users.
- Bug Fix `fix/root-env-loading`: Resolved `ERR_CONNECTION_REFUSED` on `ws://localhost:7880` by integrating `dotenv-cli` into the root orchestrator, ensuring Next.js correctly inherits `NEXT_PUBLIC_LIVEKIT_URL` from the monorepo root `.env`.

## [v0.3.1] - 2026-04-18

### Fixed
- Bug Fix `fix/missing-livekit-styles`: Resolved `Module not found: Can't resolve '@livekit/components-styles'` by explicitly installing the missing CSS module in the Next.js frontend package.

## [v0.3.0] - 2026-04-18

### Added
- Feature `feature/pipecat-gemini-live`: Designed the backend `Pipecat` pipeline leveraging `LiveKitTransport` and `GeminiLiveLLMService` to stream real-time audio and sampled video.
- Feature `feature/pipecat-gemini-live`: Wired Gemini WSS client tool execution to trigger LiveKit event dispatch and intercept backend `request_visual_context` dynamically.
- Feature `feature/pipecat-gemini-live`: Connected Pipecat text generation and tool executions into the backend FastAPI WebSocket event bus using a custom `EventBusProcessor`.
- Feature `feature/chat-ui-websocket-bus`: Implemented FastAPI WebSocket endpoint (`/api/v1/ws`) with async `ConnectionManager` and strict Pydantic JSON protocol.
- Feature `feature/chat-ui-websocket-bus`: Built production-ready `ChatContainer` React component featuring auto-scroll, optimistic UI, and Three-State architecture.
- Feature `feature/chat-ui-websocket-bus`: Developed `useZenithSocket` custom hook enforcing exponential backoff reconnection with jitter.

### Changed
- Refactor `feature/chat-ui-websocket-bus`: Migrated `MultimodalInterceptHandler` in `LiveKitSession` to trigger natively off `enable_multimodal_input` live WebSocket events instead of detached window listeners.
## [v0.2.0] - 2026-04-18

### Added
- Feature `feature/livekit-multimodal-handshake`: LiveKit WebRTC token handshake endpoint with full Next.js UI integration and intercept scaffolding.

### Changed
- Refactor `chore/gecx-structural-overhaul`: Restructured `agent/` from flat config into a modular Python package (`gecx_agent/`) with XML system instructions, OpenAPI 3.0.3 YAML tool schemas, production-grade bootstrap scripts, and deploy/teardown shell orchestration. Aligned to CES v1beta App→Agent→Toolset hierarchy.
- Refactor `chore/gecx-governance-and-prompt`: Established `gecx-engineering.md` governance rule mandating PIF XML format, multi-agent hierarchy, execution callbacks, and human escalation protocol. Rewrote system instruction to fix modality drift (text-first → visual escalation → voice transition).

## [v0.1.0] - 2026-04-17

### Added
- Feature `feature/gecx-agent-deployment-pipeline`: Implemented idempotent POST/PATCH GECX agent deployment script integrating CES API and `google-auth` ADC.
- Feature `feature/backend-scaffold`: Initialized FastAPI application inside `/backend` managed by `uv` (Python 3.12).
- Set up LiveKit Server SDK and Pipecat API orchestration boundaries. 
- Dispatched ADR 0001 validating Pipecat integration selection.
- Established `/api/v1/health` heartbeat route checking LiveKit connectivity.
- Feature `feature/nextjs-scaffold`: Initialized Next.js App Router project with Tailwind CSS v4, Shadcn UI (`base-nova` preset), and LiveKit components (`@livekit/components-react@2.9.20`).
- Configured Vitest testing environment and built landing page UI.
- Established centralized `.env.example` per monorepo governance.
- Complete `.agents` governance framework encompassing 13 rules, 4 workflows, and 7 skills.
- Strict Next.js API, styling, state, and fetching constraints via `frontend-engineering.md`.
- Strict FastAPI Async Purity, Alembic migration, and middleware limits via `backend-engineering.md`.
- Comprehensive DoD check (10 gates) enforcing testing, documentation, type-safety, and changelog sync.
- Pre-flight validation, compliance scanning, and governance-auditor meta-skills to ensure self-healing and code standards compliance.
- Autonomous `release-manager` skill for version determination from Conventional Commits.
- Project `README.md` with architecture overview, governance summary, and getting started guide.
- Root `.gitignore` covering Node.js, Python, Next.js, and IDE artifacts.
