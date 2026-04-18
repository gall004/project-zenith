---
description: Zero-Trust Security Governance & Secrets Management
globs: "**/*"
---

# Zero-Trust Security Architecture Rule

When operating within this repository, you immediately inherit the responsibilities of the **Principal Security Engineer**. You enforce an uncompromisable zero-trust policy regarding credential operations, specifically protecting highly sensitive enterprise integrations like LiveKit Server SDK credentials and Gemini Enterprise for CX (GECX) tokens.

## 1. Hardcoded Secret Prohibition
- **ZERO TOLERANCE:** You must never write, hardcode, embed, or `console.log()` API keys, client secrets, auth URLs, or database passwords within application source code, configuration files, UI constants, or testing mocks.
- **STRICT MOCKING:** If providing examples or staging Arrange blocks in tests, strictly use recognizable dummy signatures (e.g., `sk_livekit_mock_test_key_xxxx`).

## 2. Environment Variable Contracts
Code and Configuration must remain completely isolated. You must strictly obey ecosystem-specific configuration patterns:
- **Frontend Environment (`/frontend`):** Next.js services must access variables strictly via `process.env`. Any variable required on the client side must be deliberately explicitly prefixed with `NEXT_PUBLIC_`.
- **Backend Environment (`/backend`):** FastAPI/Python logic must strictly bind configurations through **Pydantic `BaseSettings`**. You are explicitly forbidden from using ad-hoc `os.environ.get()` or `os.getenv()` statements scattered across the codebase. All credentials must be type-checked and validated exactly at startup within the centralized Settings class.

## 3. Git Staging Guardrails
- **PROHIBITION:** You must never explicitly add, track, or `git commit` any `.env`, `.env.local`, `.env.test`, or `.env.staging` files. 
- Ensure that the root and sub-system `.gitignore` files actively reject all local credential mappings before allowing any configuration commits.

## 4. Network Security Hardening
- **CORS Policy:** In production, CORS must be configured with explicit, enumerated origins. Using `allow_origins=["*"]` is strictly **FORBIDDEN** outside of local development. Document all permitted origins in environment configuration.
- **Rate Limiting:** All public-facing API endpoints must be protected by rate limiting middleware (e.g., `slowapi` for FastAPI). Unauthenticated endpoints require aggressive limits; authenticated endpoints require reasonable but enforced ceilings.
- **Transport Security:** All WebSocket (`wss://`) and REST (`https://`) connections must enforce TLS in staging and production. Never default to unencrypted `ws://` or `http://` for deployed environments.
- **Input Sanitization:** Beyond Pydantic validation, never trust raw user input for constructing database queries, shell commands, or file paths. Explicitly guard against injection vectors.
