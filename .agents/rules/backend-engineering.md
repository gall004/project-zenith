---
trigger: glob
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
