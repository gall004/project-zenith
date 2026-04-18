# Project Zenith

A real-time voice AI platform powered by LiveKit WebRTC and Pipecat media pipelines.

## Architecture

Project Zenith is a **strict monorepo** with two fully isolated stacks that communicate exclusively over the network.

```
project-zenith/
├── frontend/          # Next.js (App Router) + LiveKit Client SDK + Tailwind v4
├── backend/           # FastAPI + Pipecat + LiveKit Server SDK
├── .agents/           # Antigravity governance framework (rules, skills, workflows)
├── CHANGELOG.md       # Keep a Changelog format
└── README.md
```

### Frontend
- **Framework:** Next.js (App Router)
- **WebRTC:** LiveKit Client SDK
- **Styling:** Tailwind CSS v4 (CSS-first configuration)
- **UI Components:** Shadcn/ui
- **Language:** TypeScript (strict mode)

### Backend
- **Framework:** FastAPI (fully async)
- **Media Pipelines:** Pipecat SDK
- **WebRTC:** LiveKit Server SDK
- **State Management:** Redis (all ephemeral state)
- **Language:** Python 3.11+

### Communication
The frontend and backend are **strictly isolated** — no shared code, no shared types, no cross-imports. All communication flows through:
- **REST API** (`/api/v1/`) for CRUD operations
- **WebSocket** for real-time events
- **LiveKit** for WebRTC media streams

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- Redis
- LiveKit Server (local or cloud)

### Environment Setup

Copy the environment templates and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
```

### Development

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# Run both stacks
# (from root — once centralized orchestration is configured)
make dev
```

## Governance

This project is governed by the **Antigravity** agentic framework — a comprehensive set of rules, workflows, and skills that enforce world-class engineering standards.

### Rules (13)
| Rule | Scope |
|------|-------|
| `frontend-engineering` | Next.js, LiveKit hooks, TypeScript strict mode, data fetching |
| `backend-engineering` | FastAPI async purity, Alembic migrations, middleware ordering |
| `api-contract` | REST/WebSocket naming, versioning, pagination, OpenAPI |
| `pm-governance` | BDD requirements, MECE coverage, priority classification |
| `qa-engineering` | AAA testing, test organization, canonical testing libraries |
| `clean-code` | KISS, YAGNI, naming, size limits, magic number prohibition |
| `security-standards` | Zero-trust, secrets management, network hardening |
| `error-handling` | Structured errors, retry/backoff, circuit breakers |
| `accessibility` | WCAG 2.1 AA, keyboard nav, reduced motion |
| `performance-budgets` | Core Web Vitals, bundle limits, WebRTC latency |
| `monorepo-governance` | Stack isolation, contract docs, environment templates |
| `dependency-governance` | Package justification, CVE policy, lock file integrity |
| `technical-writing` | Code documentation, CHANGELOG, TODO governance |

### Workflows (4)
| Workflow | Purpose |
|----------|---------|
| `build-feature` | End-to-end feature development with PM → TDD → Build → DoD |
| `bug-fix` | Rapid-response diagnosis, reproduction, patch, and verification |
| `refactor` | Controlled tech debt cleanup with zero-regression guarantee |
| `spike` | Time-boxed research and prototyping (no code ships to main) |

### Skills (7)
| Skill | Purpose |
|-------|---------|
| `git-manager` | Branch naming, conventional commits, merge protocol, conflict resolution |
| `dod-check` | 10-gate Definition of Done enforcement |
| `adr-manager` | Architecture Decision Record generation |
| `pre-flight-check` | Repository health validation before any workflow |
| `governance-auditor` | Self-healing audit when the project architecture evolves |
| `codebase-compliance-scanner` | Retroactive code audit against current governance rules |
| `release-manager` | Autonomous release cutting from Conventional Commits |

## Contributing

All contributions flow through the governance framework:

1. **Features** → `build-feature` workflow → squash merge to `main`
2. **Bug fixes** → `bug-fix` workflow → squash merge to `main`
3. **Tech debt** → `refactor` workflow → squash merge to `main`
4. **Releases** → `release-manager` skill → tag on `main`

Every PR must pass the 10-gate Definition of Done before merge approval.

## License

Proprietary. All rights reserved.
