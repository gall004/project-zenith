---
name: refactor
description: Controlled refactoring loop for tech debt cleanup, dependency upgrades, and structural migrations.
---

# Workflow: Controlled Refactoring

**Step 1: Scope Definition**
- **Action:** Read the user's refactoring objective.
- **Task:** Clearly document the refactoring goal, the files/modules affected, and the expected outcome. Write a brief scope summary as a comment or in `.artifacts/task.md` so the boundaries are explicit.
- **Guardrail:** A refactoring task must not introduce new features, change external behavior, or alter API contracts. If the user's request implies new functionality, redirect to the `build-feature` workflow instead.

**Step 2: Git Initialization**
- **Action:** Trigger the `git-manager` Skill.
- **Task:** Create a `chore/<kebab-case-description>` branch following the branch naming convention.

**Step 2.5: Pre-Flight Check**
- **Action:** Trigger the `pre-flight-check` Skill.
- **Task:** Verify repository health: git state (correct branch, clean working tree), dependencies installed, both stacks build clean, environment files configured, existing test suite passes. If any check fails, stop and resolve before proceeding.

**Step 3: Execute Refactoring**
- **Action:** Apply the appropriate engineering governance.
- **Task:** Enforce `frontend-engineering.md` or `backend-engineering.md` depending on the affected stack. Simultaneously enforce `clean-code.md` (KISS, YAGNI, naming standards), `security-standards.md`, and `error-handling.md`. If installing new dependencies, enforce `dependency-governance.md`.
- **Strict Constraint:** The Constrained Boy Scout Rule applies with full force. Only modify the code explicitly within scope. Do not expand the refactoring into adjacent modules or files not specified in Step 1.

**Step 4: Zero-Regression Verification**
- **Action:** Run the full test suite to confirm zero regressions.
- **Task:** Execute `npx vitest run` (frontend) and/or `pytest --tb=short` (backend) depending on the affected stack. Every test that passed before the refactoring must still pass. No exceptions.

**Step 5: Definition of Done Gate**
- **Action:** Trigger the `dod-check` Skill.
- **Task:** Run the full DoD rubric. Refactoring PRs are held to the same quality bar as feature PRs: code quality, test suite, documentation, dead code scan, artifact sync, and security scan.

**Step 5.5: Governance Audit (Conditional)**
- **Condition:** If this refactoring upgraded a major dependency, replaced a technology or tool, restructured the project directory layout, or migrated to a new pattern, this step is mandatory. Otherwise, skip.
- **Action:** Trigger the `governance-auditor` Skill.
- **Task:** Execute the 5-phase audit. Present the Governance Drift Report to the user. Apply approved governance updates and commit alongside the refactoring code using `chore(governance): update rules for <trigger event>`.

**Step 6: Pull Request & Approval Gate**
- **Action:** Commit using Conventional Commits (`refactor: ...`), push the branch.
- **Task:** Update `CHANGELOG.md` with an entry under `[Unreleased]` → `Changed` or `Removed` per `technical-writing.md` §3.
- **Handoff:** Pause and ask the user: "Refactoring complete, zero regressions, and DoD verified. Review branch `chore/<description>`. Approve squash merge to main?"

**Step 7: Release Decision**
- **Action:** After the squash merge lands on `main`, prompt the user for a release decision.
- **Handoff:** Ask the user: "This is now on main. Should I trigger the `release-manager` skill to cut a versioned release?"
- **If approved:** Trigger the `release-manager` Skill on `main`. The skill will auto-determine the version bump (MAJOR/MINOR/PATCH) from Conventional Commits, rename `[Unreleased]` to the new version, commit, tag, and push.
- **If deferred:** Acknowledge that changes will accumulate under `[Unreleased]` until a release is explicitly requested.
