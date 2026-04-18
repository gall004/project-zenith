# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Feature `feature/livekit-multimodal-handshake`: LiveKit WebRTC token handshake endpoint with full Next.js UI integration and intercept scaffolding.

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
