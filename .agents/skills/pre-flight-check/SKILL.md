---
name: pre-flight-check
description: Validates repository health before any workflow begins real work. Prevents agents from building on a broken foundation.
---

# The Pre-Flight Check Skill

Before an agent writes a single line of code, the runway must be clear. This skill verifies that the repository is in a healthy, buildable, and correctly configured state. Building on a broken foundation wastes tokens, time, and creates cascading failures that are harder to debug than the original issue.

## Trigger Conditions

This skill is **mandatory** as the first engineering step in every code-shipping workflow (`build-feature`, `bug-fix`, `refactor`) — immediately after the Git branch has been created and before any test or application code is written.

## Pre-Flight Checklist

Execute the following checks in order. If any check fails, **stop immediately**, report the failure to the user, and resolve it before proceeding with the workflow.

### 1. Git State Verification
Ensure the repository is in a clean, correct state for development.
- **Branch Confirmation:** Verify the current branch matches the branch created in the workflow's git initialization step. Never proceed if still on `main`.
- **Clean Working Tree:** Run `git status --porcelain` — output must be empty. Uncommitted changes from a previous session indicate unfinished work that must be resolved first (commit, stash, or discard).
- **Main Branch Health:** Verify `main` is not in a broken state by confirming the last commit on `main` is not a known-broken build. If the workflow was triggered because of a regression, skip this sub-check.

### 2. Dependency Installation
Verify that all dependencies are installed and current.
- **Frontend:** Confirm `frontend/node_modules/` exists. If missing, run `cd frontend && npm install`. After installation, verify `package-lock.json` has not changed — if it has, the lock file was stale and must be committed.
- **Backend:** Confirm the Python virtual environment is active and dependencies are installed. If using `requirements.txt`, verify installed packages match pinned versions. If using `pyproject.toml` with Poetry/uv, run the appropriate install command.
- **Lock File Integrity:** Both `package-lock.json` (frontend) and any Python lock file (backend) must exist and be committed to version control.

### 3. Build Verification
Confirm both stacks compile without errors.
- **Frontend:** Run `cd frontend && npx tsc --noEmit` — must exit with zero errors. If TypeScript compilation fails, the codebase is already broken and must be fixed before new work begins.
- **Backend:** Run `cd backend && ruff check .` — must exit with zero errors. Optionally run `pyright` or `mypy` if type checking is configured.
- **Fail-Fast:** If either stack fails to build, immediately report the specific errors to the user. Do not attempt to fix pre-existing build failures as part of the current workflow — redirect to a `bug-fix` workflow instead.

### 4. Environment Configuration
Verify that the root environment file is present and complete per `monorepo-governance.md` §4.
- **Root `.env`:** Confirm a `.env` file exists at the repository root. Cross-reference against `.env.example` — every variable listed in the example must have a corresponding entry in the active `.env` file.
- **Missing Variables:** If any required variable from `.env.example` is missing in the active `.env`, warn the user but do not block the workflow (the variable may have a default value in code).
- **No Per-Stack Files:** Confirm no stale per-stack env files exist (`frontend/.env.local`, `backend/.env`). If found, warn the user that these violate the single-root-env architecture and may cause configuration drift.

### 5. Test Suite Baseline
Confirm the existing test suite passes before writing new code.
- **Frontend:** Run `cd frontend && npx vitest run` — must exit with zero failures. If tests fail, the codebase has pre-existing regressions that must be resolved first.
- **Backend:** Run `cd backend && pytest --tb=short -q` — must exit with zero failures.
- **Skip Condition:** If the workflow is `bug-fix` and Step 1 (Diagnostics) has already confirmed the test suite state, this sub-check may be skipped to avoid redundancy.

## Output

Report the pre-flight results in a concise summary:

```
Pre-Flight Check: ✅ PASSED
- Git: on branch feature/livekit-room-join, clean working tree
- Dependencies: frontend ✅ | backend ✅
- Build: frontend ✅ (tsc clean) | backend ✅ (ruff clean)
- Environment: frontend ✅ (12/12 vars) | backend ✅ (8/8 vars)
- Test Baseline: frontend ✅ (47 passed) | backend ✅ (31 passed)
```

Or, if any check fails:

```
Pre-Flight Check: ❌ FAILED
- Build: frontend ❌ — 3 TypeScript errors in ParticipantTile.tsx
- Action Required: Fix pre-existing build errors before proceeding.
```

## Guardrails

- **No Auto-Fix of Pre-Existing Issues:** This skill detects problems — it does not fix them. If the codebase is broken before the workflow starts, report the issue and redirect to the appropriate workflow (`bug-fix` for regressions, `refactor` for structural issues).
- **Speed Over Depth:** Pre-flight should complete in under 60 seconds. It is a fast health check, not a comprehensive audit. Deep analysis belongs in the `dod-check` and `governance-auditor` skills.
