---
name: bug-fix
description: Rapid-response development loop for diagnosing and patching bugs without PM overhead.
---

# Workflow: Rapid-Response Bug Fix

**Step 1: Diagnostics & Root Cause Analysis**
- **Action:** Act as the QA Lead (Apply rule: `qa-engineering.md`).
- **Task:** Ingest the user's provided error logs, stack traces, or behavioral descriptions. Analyze the network boundaries to immediately isolate whether the failure originated in the Next.js frontend or the FastAPI backend.

**Step 1.5: Git Initialization**
- **Action:** Trigger the `git-manager` Skill.
- **Task:** Create the `fix/issue-name` branch (following the branch naming convention) **before writing any code**. All subsequent work must occur on this branch — never on `main`.

**Step 1.75: Pre-Flight Check**
- **Action:** Trigger the `pre-flight-check` Skill.
- **Task:** Verify repository health: git state (correct branch, clean working tree), dependencies installed, both stacks build clean, environment files configured. The test baseline sub-check may be skipped since Step 1 already characterized the test suite state.

**Step 2: Failing Test Creation (Reproduction)**
- **Action:** Continue under the QA Lead persona.
- **Task:** Before editing any application source code, write a failing automated test utilizing Arrange-Act-Assert (AAA) methodology that accurately replicates the exact bug payload, LiveKit drop, or crash. Execute the test to confirm predictable failure.

**Step 3: Develop the Patch**
- **Action:** Build the fix.
- **Task:** Apply the appropriate engineering governance. Enforce `frontend-engineering.md` if patching the Next.js UI tier, or `backend-engineering.md` if operating within the async FastAPI tier. Actively enforce `security-standards.md`, `clean-code.md`, and `error-handling.md`. If installing new dependencies, enforce `dependency-governance.md`.

**Step 4: Verification & Test Suite**
- **Action:** Execute automated verification.
- **Task:** Re-run the test suite to verify the previously failing test now passes. Confirm the patch has not degraded LiveKit WebRTC speed or broken surrounding network contracts across the monorepo boundary.

**Step 4.5: Definition of Done Gate**
- **Action:** Trigger the `dod-check` Skill.
- **Task:** Even hotfixes must meet quality standards. Run the full DoD rubric: code quality (lint + type check), test suite (zero failures), documentation (env vars updated if applicable), dead code scan, artifact sync, security scan, CHANGELOG sync, and TODO hygiene. Any gate failure must be resolved before proceeding to Step 5.

**Step 5: Commit, Push & Approval Gate**
- **Action:** Finalize the branch for review.
- **Task:** Commit the passing tests alongside the application patch using Conventional Commits (`fix: ...`). Update `CHANGELOG.md` with an entry under `[Unreleased]` → `Fixed` per `technical-writing.md` §3. Push the branch, then immediately pause to ask the user: "Bug patched, tests passing, and DoD verified. Review branch `fix/issue-name`. Approve squash merge to main?"
