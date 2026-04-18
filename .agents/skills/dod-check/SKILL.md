---
name: dod-check
description: Enforces a strict Definition of Done rubric before squash-merge approval.
---

# The Deep "Definition of Done" (DoD)

To prevent the PM from prematurely celebrating, Antigravity needs a strict rubric. Before asking for the user's squash-merge approval, the system must verify every gate below passes sequentially.

## 1. Code Quality
No linting or TypeScript/Pyright type errors remain.
- **Frontend Verification:** Run `npx tsc --noEmit` (type check) and `npx eslint . --max-warnings 0` (lint check).
- **Backend Verification:** Run `pyright` or `mypy` (type check) and `ruff check .` (lint check).
- **Zero Tolerance:** Any warning or error output from the above commands constitutes a gate failure. Do not proceed.

## 2. Testing
All unit and integration tests pass (specifically ensuring LiveKit connection handles drops/reconnects gracefully).
- **Frontend Verification:** Run `npx vitest run` and confirm zero failures.
- **Backend Verification:** Run `pytest --tb=short` and confirm zero failures.
- **No Skipped Tests:** Any `test.skip()` or `@pytest.mark.skip` must have an adjacent justification comment. Unexplained skips are a gate failure.

## 3. Documentation
The `README.md` or internal `docs/` have been updated with any new environment variables required for Pipecat/GECX.
- **Verification:** If the diff introduces any new `process.env.*` or `BaseSettings` field, confirm a corresponding entry exists in the root `README.md` environment variables table and/or `docs/`.

## 4. No Dead Code
The codebase contains no `console.log`, commented-out code blocks, or unused Shadcn components.
- **Frontend Scan:** Run `grep -rn "console\.log" frontend/ --exclude-dir={node_modules,.next}` — output must be empty.
- **Backend Scan:** Run `grep -rn "print(" backend/app/ agent/` — output must be empty (use structured logging, not print statements).
- **Commented-Out Code:** Visually scan the diff for any blocks of commented-out application code. Commented-out code is never acceptable in a merge-ready branch.

## 5. Artifact Sync
The PM's `task.md` has all checkboxes explicitly marked complete.
- **Verification:** Read `.artifacts/task.md` and confirm every `- [ ]` checkbox has been changed to `- [x]`. Any unchecked box is a gate failure — either the work is incomplete or the PM artifact is stale.

## 6. Security Scan
No credentials, secrets, or sensitive configuration have leaked into the codebase or Git staging area.
- **Staged `.env` Check:** Run `git diff --cached --name-only | grep -E "\.env"` — output must be empty. Any `.env` variant in the staging area is an immediate gate failure.
- **Hardcoded Secret Scan:** Run `grep -rn "LIVEKIT_API_SECRET\|GEMINI_API_KEY\|sk_live\|pk_live" frontend/ backend/app/ agent/ --exclude-dir={node_modules,.next}` — output must be empty. Any match indicates a hardcoded credential.
- **`.gitignore` Validation:** Confirm that `.env`, `.env.local`, `.env.test`, and `.env.staging` entries exist in the root `.gitignore` file.

## 7. CHANGELOG Sync
Every merge to `main` must include a CHANGELOG entry per `technical-writing.md` §3.
- **Verification:** Open `CHANGELOG.md` and confirm a new entry exists under the `[Unreleased]` section that corresponds to the current branch's work, categorized as `Added`, `Changed`, `Fixed`, or `Removed`.
- **Traceability:** The CHANGELOG entry should reference the relevant feature branch name or `task.md` requirement for auditability.

## 8. Accessibility Compliance (Frontend Only)
If the diff touches frontend UI components, verify WCAG 2.1 AA compliance per `accessibility.md`.
- **Semantic HTML Check:** Confirm that new interactive elements use semantic HTML (`<button>`, `<nav>`, `<dialog>`) instead of generic `<div>` wrappers with click handlers.
- **ARIA Verification:** Confirm all interactive Shadcn components and LiveKit participant tiles carry appropriate `aria-*` attributes.
- **Keyboard Navigation:** Verify that new interactive elements are reachable via Tab and operable via Enter/Escape without requiring a mouse.
- **Skip Condition:** This gate is automatically skipped if the diff contains zero changes to files in `frontend/components/` or `frontend/app/`.

## 9. API Contract Sync (Backend Only)
If the diff modifies backend API routes or Pydantic request/response schemas, verify contract documentation is updated per `api-contract.md` §7 and `monorepo-governance.md` §5.
- **New Endpoints:** If a new route handler was added, confirm a corresponding entry exists in `/docs/contracts/` (OpenAPI spec or structured Markdown).
- **Schema Changes:** If Pydantic models used as `response_model` or request bodies were modified, confirm the updated shapes are reflected in the contract documentation.
- **OpenAPI Export:** If the API surface changed, confirm `/docs/contracts/openapi.json` has been regenerated or updated.
- **Skip Condition:** This gate is automatically skipped if the diff contains zero changes to files in `backend/app/api/` or `backend/app/models/`.

## 10. TODO/FIXME Hygiene
Unattributed TODO and FIXME comments are invisible tech debt per `technical-writing.md` §4.
- **Verification:** Run `grep -rn "TODO\|FIXME" frontend/ backend/app/ agent/ --exclude-dir={node_modules,.next}` and verify every match includes attribution (author) and a linked reference (issue or task.md section).
- **Gate Failure:** Any naked `TODO:` or `FIXME:` without context or attribution is a gate failure. Either add proper attribution or resolve the TODO before merge.
