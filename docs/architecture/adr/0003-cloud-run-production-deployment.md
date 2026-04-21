# ADR 0003: Cloud Run Production Deployment

**Date:** 2026-04-21
**Status:** Accepted
**Deciders:** Nathan Galloway

## Context

Project Zenith runs as a monorepo with a Next.js frontend and FastAPI backend. The backend maintains persistent WebSocket connections for real-time chat, uses Redis for session state, and spawns Pipecat media pipelines for multimodal WebRTC interactions. A production deployment path is needed to move beyond the local dev environment (ngrok + Docker Redis).

## Decision

Deploy to **Google Cloud Run** (two services) with **Memorystore for Redis** and **Secret Manager** for credentials. Infrastructure is managed via idempotent shell scripts (`deploy.sh` / `teardown.sh`) reading from a `deploy.env` config file.

### Architecture

| Component | Service | Rationale |
|-----------|---------|-----------|
| Frontend | Cloud Run (`zenith-frontend`) | Serverless, auto-scales to zero when idle |
| Backend | Cloud Run (`zenith-backend`) | WebSocket support, session affinity, 3600s timeout |
| Redis | Memorystore Basic (1GB) | Managed, private networking, no ops burden |
| Secrets | Secret Manager | Native Cloud Run integration, audit logging |
| Networking | Serverless VPC Access | Required for Cloud Run → Memorystore connectivity |
| Images | Artifact Registry | Regional, integrated with Cloud Run |

### WebSocket Configuration

Cloud Run supports WebSockets natively with these settings:
- **HTTP/2 disabled** (`--no-use-http2`): WebSocket requires HTTP/1.1 upgrade
- **Session affinity enabled**: Ensures reconnections hit the same instance
- **Request timeout: 3600s**: Maximum allowed for long-lived connections
- **Min instances: 1**: Avoids cold-start killing active WebSocket sessions

## Alternatives Considered

### Google Kubernetes Engine (GKE)
- **Pros:** Full control, persistent pods, no request timeout limits
- **Cons:** Operational overhead, cost floor (~$75/mo for Autopilot), overkill for a demo/POC
- **Verdict:** Rejected for now. Cloud Run's 1-hour timeout is sufficient for demo sessions.

### App Engine Flexible
- **Pros:** WebSocket support, managed
- **Cons:** Slow deploys (5-10 min), expensive min instance ($30/mo), being de-emphasized by Google
- **Verdict:** Rejected. Cloud Run is the clear successor.

### Terraform for IaC
- **Pros:** Declarative state management, drift detection
- **Cons:** Additional tooling dependency, state file management, overkill for ~8 resources
- **Verdict:** Deferred. Idempotent `gcloud` scripts are simpler for the current scale. Can migrate to Terraform if the infra grows.

## Consequences

- **Positive:** Zero-ops deployment (single `./infra/deploy.sh`), auto-scaling, managed Redis, native secret injection
- **Positive:** CES webhook URL becomes stable (replaces ngrok)
- **Negative:** WebSocket sessions limited to 1 hour (Cloud Run max timeout)
- **Negative:** Memorystore requires VPC connector ($7/mo idle cost)
- **Risk:** Cold starts on frontend (min instances = 0) may cause 2-3s first-load delay
