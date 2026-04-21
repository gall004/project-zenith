# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Feature `feature/cloud-run-production-deploy`: Idempotent `deploy.sh` and `teardown.sh` scripts for full GCP production deployment. Reads all config from `infra/deploy.env` — zero interactive prompts.
- Feature `feature/cloud-run-production-deploy`: Backend Dockerfile (multi-stage uv + Python 3.12) and Frontend Dockerfile (multi-stage Node 22 + Next.js standalone output).
- Feature `feature/cloud-run-production-deploy`: Provisions Memorystore (Redis 7), Serverless VPC Access connector, Artifact Registry, Secret Manager secrets, and dedicated service account with least-privilege IAM roles.
- Feature `feature/cloud-run-production-deploy`: Cloud Run backend configured for WebSocket support: HTTP/1.1 (no HTTP/2), session affinity, 3600s timeout, min 1 instance.
- ADR `0003-cloud-run-production-deployment.md`: Documenting the decision to use Cloud Run over GKE/App Engine, and idempotent scripts over Terraform.

### Changed
- Refactor `feature/cloud-run-production-deploy`: CORS origins now dynamically configured via `CORS_ORIGINS` env var (comma-separated) instead of hardcoded localhost. Production values set by the deploy script.
- Refactor `feature/cloud-run-production-deploy`: Next.js config updated with `output: 'standalone'` for optimized Docker builds.

## [v1.7.3] - 2026-04-20
### Fixed
- Fixed an infinite UI spinning loop caused by unhandled GECX textless `endSession` system flags failing to propagate to the frontend socket.
- Fixed a persistent Redis state poison bug in `session_store.py` that forced the Gemini Live multmodal camera widget to instantly reopen and reconnect after page reloads.

## [v1.7.2] - 2026-04-20

### Fixed
- Bug `fix/livekit-drawer-coupling`: Refactored `VoiceSessionClient` to employ an internal latching boolean (`hasOpened`) that decouples the underlying LiveKit WebRTC connection from the `ZenithDrawer` visibility state. This ensures that closing the side panel after initial activation no longer terminates the session or drops the multi-modal camera feed.

## [v1.7.1] - 2026-04-20

### Changed
- Refactor `chore/precision-void-aesthetic`: Completes the adoption of the high-fidelity enterprise light styling throughout the core `ChatContainer` UI block. Migrated unreadable legacy Shadcn neon tokens on message bubbles and drawer backgrounds over to standard semantic `text-on-surface` and `surface-container-low` mapping. Upgraded Action Badges and input rows for strict WCAG contrast compliance. Added dynamic segmented utility row for inline copy/export of full multimodal transcripts.
- Refactor `chore/theme-refactor`: Refactored `globals.css` base-nova OKLCH theme configuration to explicitly adopt the designated light-mode Tailwind color palette (`bg-surface`, `text-on-surface`, `surface-container`, etc.) mapping to the new Precision Void design iteration. Stripped the hardcoded `dark` enforcement from the Next.js `RootLayout` component, seamlessly reverting the entire application to the targeted crisp daylight technical UI.
- Refactor `chore/drawer-scrollable-refactor`: Refactored ZenithDrawer into a non-modal persistent side panel on desktop by enabling `modal={false}` and `hasOverlay={false}`. The user can now seamlessly scroll and interact with the main page behind the agent drawer while maintaining a full-view overlay on mobile.
- Refactor `chore/refactor-architecture-section`: Overhauled the UI Architecture and Cost section. Removed the "Google-Native vs Portable Middleware" comparison to focus purely on the required Portable Middleware stack (Pipecat + LiveKit or Stream), as direct WebSockets are necessary to enable function calling and enterprise-grade multi-agent orchestration.

### Fixed
- Bug `fix/mobile-menu-hamburger`: Introduced an animated mobile dropdown header (`isMobileMenuOpen`) activated by a responsive hamburger icon. Elevated the inline horizontal navigation breakpoints from `md` to `lg` to prevent squishing and overlap on tablet and mobile viewports, assuring the `Ask Zenith` primary action button is always persistently accessible in the upper right. Additionally, replaced the Next.js generic browser favicon with the unified `radar` material symbol encoded natively as an SVG, and hid the full "Project Zenith" masthead text entirely on ultra-mobile screens to aggressively save space.

- Bug `fix/audiocontext-resumption`: Fixed bug where LiveKit eagerly initialized WebSockets in the background, violating Chrome's strict AudioContext autoplay policies and rendering redundant permissions warnings. Connection logic is now explicitly deferred to the "Ask Zenith" explicit user gesture window by passing `<LiveKitRoom connect={isOpen} />`.
## [v1.7.0] - 2026-04-20
### Added
- Feature `feature/sentiment-avatar`: Added a dedicated Emotionally Intelligent Companion (`sentiment_system.xml`) intended for facial expression analysis and emotional support demos.
- Feature `feature/sentiment-avatar`: Added the `SENTIMENT_ANALYSIS_NEEDED` intent routing into GECX orchestration, keeping the original Universal Technical Concierge intact.
- Feature `feature/sentiment-avatar`: Introduced `OrbAvatar` visualizer component via `@livekit/components-react`, syncing an absolute-positioned sleek glowing orb to real-time `isSpeaking` states for immersive "conversational presence".

### Changed
- Refactor `feature/sentiment-avatar`: Reused the existing `request_visual_context` OpenAPI tool pipeline by introducing an optional `pipeline_type` argument, avoiding unnecessary endpoint bloat.
- Refactor `feature/sentiment-avatar`: Rewrote the `ChatContainer.tsx` to an enterprise-grade UI featuring message grouping, fixed timestamps, hover-to-copy, and sender avatars matching the drawer styling.
- Refactor `feature/sentiment-avatar`: Restructured `pipecat_system.xml` and `sentiment_system.xml` conversational flows for clear, natural progression and strict control of turn cuing.
- Refactor `feature/sentiment-avatar`: Replaced manual "speak goodbye" behavior with a silent `end_vision_session` handoff, relying on the GECX agent to naturally resume the text flow.

### Fixed
- Bug `feature/sentiment-avatar`: Standardized the `end_vision_session` tool schema to use `function_declarations` ensuring compatibility with the Pipecat 1.0.0 Google implementation.
- Bug `feature/sentiment-avatar`: Fixed silent unhandled callbacks by correctly typing the function arguments required by Pipecat`s `register_function`.
- Bug `feature/sentiment-avatar`: Prevented Pipecat Gemini hallucination during text chat injection by adopting `TranscriptionFrame` routing into the realtime stream over isolated content appends.

## [v1.6.0] - 2026-04-19
### Added
- Feature `feature/hallway-demo-pivot`: Separated monolithic prompt instructions into `gecx_system.xml` and `pipecat_system.xml` to strictly bound orchestration logic vs multimodal generation.
- Feature `feature/hallway-demo-pivot`: Pivoted the agent from strict IoT-router support to an enthusiastic "Universal Technical Concierge" capable of playfully identifying random camera objects.
- Feature `feature/hallway-demo-pivot`: Augmented Pipecat instructions to gracefully handle blank/dark camera feeds by naturally requesting lighting adjustments without breaking spoken delivery.
- Feature `feature/hallway-demo-pivot`: Implemented two-way multimodal handoff architecture. Video session summaries are dynamically relayed back to the GECX agent to effortlessly resume text-mode context where visual interaction left off.
- Feature `feature/hallway-demo-pivot`: Introduced interactive LiveKit session control overlay with microphone and hardware-level camera disable toggles to entirely eliminate vision-caching hallucinations.
- Feature `feature/hallway-demo-pivot`: Added manual visual session `handoff` endpoints and globally accessible agent UI using Context-API-based AppShell architecture.

### Fixed
- Bug `fix/backend-regressions`: Resolved Pytest `RuntimeError: Event loop is closed` during WebSocket testing by patching global `app.services.session_store` directly.
- Bug `fix/backend-regressions`: Resolved `ruff` static analysis errors by removing extraneous imports in `ws.py` and correctly hoisting `Attachment` module imports in `room_pipeline.py`.
- Bug `fix/backend-regressions`: Restored previously modified `deploy.sh` script to fix syntax error and committed `system_instruction.xml` persona expansion update.

## [v1.5.0] - 2026-04-19
### Added
- Feature: Enable Multimodal File Attachments (`feature/enable-attachments`). Users can now upload images locally via the `ChatContainer`.
- Chat attachments are passed transparently into the Customer Engagement Suite (CES) as native base64 `Image` payloads, bypassing traditional proxy loops to ensure native agent comprehension.
- Pipecat seamlessly consumes attachments as `LLMMessagesAppendFrame` instances to retain conversation history and avoid overwriting the live WebRTC stream.

## [v1.4.0] - 2026-04-19

### Added
- Feature `feature/persistent-video-overlay`: Decoupled the multimodal LiveKit viewfinder from the drawer using React Portals, adding a tap-to-corner positioning system and a persistent global UI banner indicating active session status when the agent drawer is collapsed.

## [v1.3.0] - 2026-04-19

### Added
- Feature `feature/architecture-cost-section`: Added an interactive "Architectural Trade-off" component to the landing page demonstrating the specific Google-Native vs Pipecat/LiveKit trade-offs alongside a line-by-line estimated session cost breakdown.

## [v1.2.0] - 2026-04-19

### Added
- Feature `feature/redis-session-state`: Introduced Redis-backed backend-owned session state layer. All session metadata (identity, room assignment, multimodal state, escalation data) is now persisted in Redis under `session:{room_name}` with 24-hour TTL auto-expiry.
- Feature `feature/redis-session-state`: New REST endpoints for session lifecycle — `POST /api/v1/sessions` (create/resume), `GET /api/v1/sessions/{room_name}` (hydrate), `GET /api/v1/sessions/{room_name}/transcript` (chat history), `DELETE /api/v1/sessions/{room_name}` (end session).
- Feature `feature/redis-session-state`: Chat transcript persistence via Redis lists (`transcript:{room_name}`). Every user and agent message is appended server-side.
- Feature `feature/redis-session-state`: Frontend session API client (`lib/api/sessions.ts`) with cookie-based session handle replacing all `sessionStorage` usage.
- Feature `feature/redis-session-state`: Health endpoint now reports `redis: "ok"/"error"` and `active_sessions` count for operations monitoring.
- ADR `0002-redis-session-state.md`: Documenting the architectural decision to move session state from frontend `sessionStorage` to backend-owned Redis.

### Changed
- Feature `feature/redis-session-state`: WebSocket handler now persists messages to Redis transcript on send/receive and checks Redis session status during grace period pipeline teardown (replaces in-memory-only connection count check).
- Feature `feature/redis-session-state`: Agent webhook now writes multimodal state to Redis *before* emitting the WebSocket event (write-before-emit pattern) ensuring simultaneous refreshes always find current state.
- Feature `feature/redis-session-state`: `VoiceSessionClient` now hydrates from backend API on mount with loading/error states, instead of reading from `sessionStorage`.
- Feature `feature/redis-session-state`: `ChatContainer` now hydrates transcript from `GET /api/v1/sessions/{room_name}/transcript` on mount.
- Feature `feature/redis-session-state`: FastAPI lifespan now initializes Redis connection pool on startup and gracefully closes on shutdown.

### Removed
- Feature `feature/redis-session-state`: Removed all `sessionStorage` reads/writes from `VoiceSessionClient.tsx` and `ChatContainer.tsx`. Frontend no longer owns session state.

### Changed
- Refactor `chore/ui-ux-overhaul-shadcn`: Redesigned the primary application layout into a marketing landing page that launches the chat flow into a sliding Shadcn `<Sheet>` Drawer component. Restyled text chat UI (`ChatContainer`) to match specific dark technical aesthetics using custom CSS variables mapped to Tailwind v4. 
- Refactor `chore/ui-ux-overhaul-shadcn`: Unified WebRTC layout hierarchy by migrating the `<LiveKitSession />` inline into the ChatContainer DOM, ensuring the multimodal video feed rests within the visual flow of the user interaction.

### Changed
- Refactor `chore/drawer-presentation-refactor`: Cleaned up the drawer presentation logic by setting the chat input to a higher-contrast background color, fixing an awkward flex-scroll container overlap, and removing the legacy webRTC user-permission block so it immediately negotiates on open.
- Refactor `chore/drawer-cleanup-round2`: Completely removed the active LiveKit session node placeholder to streamline the chat flow, separated the documentation reference into two explicit links outlining Gemini API and CX Agent Studio, transformed the chat input bar into a fully responsive modern floating pill-style component (dropping the Shadcn variant to fix CSS inheritance bugs on the disabled state), and patched Shadcn Sheet `[data-side=right]` specificity to guarantee a true full-screen overlay experience on mobile.

### Added
- Feature `feat/session-persistence`: Introduced robust session management capabilities. WebRTC/LiveKit and GECX metadata (room IDs and identities) now persist via local `sessionStorage` alongside the active chat transcript, enabling seamless re-joins after page refreshes. Supported by backend enhancements including a 30-second graceful disconnection window and an explicit `DELETE /api/v1/sessions/{room_name}` REST endpoint mapped to a new "End Session" UI action button in the chat UI.
- Bug `fix/update-company-branding`: Corrected hardcoded company branding in the footer to display "TTEC Digital" instead of "Precision AI" and updated page copy to accurately reflect the goal of demonstrating multimodal AI interactions to customers.
- Bug `fix/end-session-modal`: Added a Shadcn AlertDialog confirmation barrier to the "End Session" action to prevent accidental UX state deletion.
- Bug `fix/remove-intercept-node`: Dark-themed the chat's strict webkit scrollbar for visual cohesion and implemented a reactive floating "scroll to bottom" helper button.
- Bug `fix/multimodal-refresh`: Hydrated orchestration states (`multimodalEvent` and `escalationData`) from `sessionStorage` into `VoiceSessionClient` on component mount. Fixes critical bug where camera streams failed to re-initialize on browser refresh during active LiveKit multimodal escalations.

### Removed
- Bug `fix/remove-intercept-node`: Deleted the obsolete 'Intercept Node Active' badge from the LiveKitSession component to resolve the UI overflow and prevent clipping into the "End Session" modal toggle.
- Refactor `chore/ui-ux-overhaul-shadcn`: Deleted explicit isolated `/voice-session` standalone page in favor of unified Single Page Application logic.

## [v1.1.0] - 2026-04-18

### Added
- Feature `fix/multimodal-auto-escalation`: Implemented robust routing of typed chat messages during active Gemini Live escalated sessions. Text is now dynamically injected as `LLMMessagesAppendFrame` allowing Gemini Live to provide voice+text responses.
- Feature `fix/multimodal-auto-escalation`: Overhauled multimodal WebRTC initialization pipeline, placing a `TranscriptionInterceptor` before the LLM to successfully isolate and relay upstream `TranscriptionFrame` speech components to the chat UI.
- Feature `fix/multimodal-auto-escalation`: Introduced independent local preview loop utilizing `navigator.mediaDevices.getUserMedia()`, bypassing LiveKit `Track` consumption limitations to ensure consistent rendering of local video feed.

### Fixed
- Bug `fix/multimodal-auto-escalation`: Reordered Pipecat frame logic (abandoning `LLMMessagesAppendFrame` for `LLMContextFrame`) on WebRTC initialization to force `_ready_for_realtime_input = True`, resolving silent microphone issues by ensuring Server VAD actively listens to user audio payload streams.
- Bug `fix/multimodal-auto-escalation`: Muted GECX system instruction explicitly upon activating the multimodal camera view to prevent duplicate simultaneous spoken overlap when Gemini Live transitions into the session.

## [v1.0.2] - 2026-04-18

### Fixed
- Bug `fix/duplicate-chat-and-webhook-fail`: Resolved duplicate text history rendering in `ChatContainer` by eliminating redundant `onKeyDown` listeners that caused form submission races on mobile/desktop clients when dispatching WebSocket payloads.
- Bug `fix/duplicate-chat-and-webhook-fail`: Fixed GECX Agent failing to execute `request_visual_context` tool by making NGA escalation variables optional in the Pydantic `WebhookRequest` schema, preventing `422 Unprocessable Entity` HTTP crashes when CES omits them during standard escalations.
- Bug `fix/gecx-openapi-tool-schema`: Completely rebuilt the backend FastAPI Webhook schema to strictly match the Generative Agent YAML OpenAPI specification (`request_visual_context.yaml`). Eliminated Dialogflow Webhook schema assumptions, allowing Vertex AI to successfully process `200 OK` tool status responses sequentially.

## [v1.0.1] - 2026-04-18

### Fixed
- Bug `fix/audio-context-autoplay`: Resolved Chrome/Safari WebAudio API `AudioContext` autoplay DOM exceptions. LiveKit connection initialization (requesting the secure token and setting `connect={true}`) is now strictly gated behind an explicit `hasStarted` user gesture in the Escalation UI, honoring the latest browser media play constraints natively.

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
