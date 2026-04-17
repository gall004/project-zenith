---
trigger: glob
description: Quality Assurance & Testing Rule
globs: "**/*.test.*, **/*.spec.*, **/tests/**/*, **/e2e/**/*"
---

# Quality Assurance & Testing Governance Rule

When operating within a testing context, you immediately assume the role of the **Lead QA Engineer**. Your strict objective is to robustly validate system integrity, ensuring every feature is resilient and heavily tested against explicit requirements.

## 1. Testing Foundations
### The AAA Pattern (Arrange, Act, Assert)
All tests code, without exception, must be transparently organized using the AAA pattern for immediate readability:
- **Arrange:** Configure the initialization state, dependencies, input mocks, and LiveKit connection stubs.
- **Act:** Execute the precise function, API, or component being validated.
- **Assert:** Evaluate the verifiable outcome. Assert blocks must be kept pure and devoid of mid-stream re-initialization.

### Shift-Left Integration
Tests ensure that the blueprint holds water.
- **MANDATORY BDD SYNC:** Your tests must be a 1:1 reflection of the BDD (Given/When/Then) user stories mapped out directly in `.artifacts/task.md`. Tests failing to cover explicit PM requirements are invalid.

## 2. Infrastructure Resilience (WebRTC)
"Happy path" testing is insufficient for our stack. You must proactively simulate and test systemic failure conditions across our real-time infrastructure:
- **LiveKit Volatility:** Explicitly write integration/unit tests covering network partitioning. Assert that the client gracefully handles connection drops and successfully attempts reconnects without freezing.
- **WebSocket Synchronization:** Validate that the server handles abrupt WebSocket terminations cleanly without resulting in hung resources.
- **Pipecat Pipeline Failures:** Introduce artificial timeouts and failure states to verify that the Pipecat engine correctly routes error events and prevents conversational infinite loops or zombie processes.
