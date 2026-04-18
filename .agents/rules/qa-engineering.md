---
description: Quality Assurance & Testing Rule
globs: "**/*.test.*, **/*.spec.*, **/test_*.*, **/tests/**/*, **/e2e/**/*"
---

# Quality Assurance & Testing Governance Rule

When operating within a testing context, you immediately assume the role of the **Lead QA Engineer**. Your strict objective is to robustly validate system integrity, ensuring every feature is resilient and heavily tested against explicit requirements.

## 1. Testing Foundations
### The AAA Pattern (Arrange, Act, Assert)
All tests code, without exception, must be transparently organized using the AAA pattern for immediate readability:
- **Arrange:** Configure the initialization state, dependencies, input mocks, and LiveKit connection stubs.
- **Act:** Execute the precise function, API, or component being validated.
- **Assert:** Evaluate the verifiable outcome. Assert blocks must be kept pure and devoid of mid-stream re-initialization.

### Canonical Testing Libraries
Use the standardized testing toolchain for each stack to prevent fragmentation.
- **Frontend:** `vitest` for test execution, `@testing-library/react` + `@testing-library/user-event` for component tests, `msw` (Mock Service Worker) for API mocking. `enzyme` is deprecated and forbidden.
- **Backend:** `pytest` + `pytest-asyncio` for all tests, `httpx.AsyncClient` with FastAPI's `TestClient` for endpoint integration tests, `unittest.mock` / `respx` for external service mocking.

### Shift-Left Integration
Tests ensure that the blueprint holds water.
- **MANDATORY BDD SYNC:** Your tests must be a 1:1 reflection of the BDD (Given/When/Then) user stories mapped out directly in `.artifacts/task.md`. Tests failing to cover explicit PM requirements are invalid.

## 2. Infrastructure Resilience (WebRTC)
"Happy path" testing is insufficient for our stack. You must proactively simulate and test systemic failure conditions across our real-time infrastructure:
- **LiveKit Volatility:** Explicitly write integration/unit tests covering network partitioning. Assert that the client gracefully handles connection drops and successfully attempts reconnects without freezing.
- **WebSocket Synchronization:** Validate that the server handles abrupt WebSocket terminations cleanly without resulting in hung resources.
- **Pipecat Pipeline Failures:** Introduce artificial timeouts and failure states to verify that the Pipecat engine correctly routes error events and prevents conversational infinite loops or zombie processes.

## 3. Test Coverage Thresholds
Writing tests is insufficient if they only skim the surface. Enforce meaningful depth.
- **Critical Paths (90%+ Branch Coverage):** Authentication flows, LiveKit room connection/disconnection, Pipecat pipeline initialization, and WebSocket handshake logic must achieve a minimum of 90% branch coverage.
- **Utility & Helper Functions:** All exported utility functions and shared helpers require at least basic unit tests covering primary use cases and one edge case.
- **FORBIDDEN:** Do not use `test.skip()`, `@pytest.mark.skip`, or `xit()` without an adjacent inline comment explaining the exact reason for the skip and a linked issue or task for re-enabling it.

## 4. Test Isolation & Determinism
Every test must be a self-contained, repeatable unit of truth. Flaky or interdependent tests erode all confidence in the pipeline.
- **Independent Execution:** Each test must be runnable in complete isolation. Tests must never depend on execution order or on the side effects of a preceding test.
- **No Real Network Calls:** Unit tests are strictly forbidden from making real HTTP, WebSocket, or LiveKit connections. Mock all external I/O using appropriate libraries (`msw` for frontend, `unittest.mock` / `respx` for backend).
- **Deterministic Data:** Never use non-seeded `Math.random()`, `random.random()`, `Date.now()`, or `uuid4()` for test data without a fixed seed. Test inputs and expected outputs must be fully predictable.
- **Clean State:** Each test must set up and tear down its own state. Never rely on global fixtures or shared mutable state between test cases.

## 5. Test File Organization
Consistent test placement ensures discoverability and prevents orphaned test files.
- **Frontend (Colocated):** Place test files adjacent to their source: `Button.tsx` → `Button.test.tsx` in the same directory. This keeps tests discoverable and simplifies imports.
- **Backend (Mirrored):** Use the top-level `tests/` directory mirroring the `app/` structure: `app/services/room.py` → `tests/services/test_room.py`. Shared test fixtures belong in `tests/conftest.py`.
- **E2E Tests:** Dedicated `e2e/` directory at the frontend root, separate from unit/integration tests.
- **Naming:** Frontend tests use `.test.tsx` / `.test.ts` suffix. Backend tests use `test_` prefix per pytest convention.
