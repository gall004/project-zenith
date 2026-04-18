---
name: git-manager
description: Enforces appropriate github governance. Governs how code moves from an idea to production.
---

# The Git Management Skill

Antigravity will use this skill to govern how code moves from an idea to production.

## The Law of the Branch
No agent is ever allowed to commit directly to main.

## Branch Naming Convention
All branch names must follow a strict, predictable pattern for immediate human and CI readability.
- **Feature Work:** `feature/<kebab-case-description>` (e.g., `feature/livekit-room-join`)
- **Bug Fixes:** `fix/<kebab-case-description>` (e.g., `fix/websocket-reconnect-loop`)
- **Maintenance/Chores:** `chore/<kebab-case-description>` (e.g., `chore/upgrade-pipecat-sdk`)
- **FORBIDDEN:** No uppercase letters, no spaces, no special characters beyond hyphens. Branch names must be lowercase kebab-case only.
- **Descriptive:** The description segment must be concise but meaningful. Generic names like `feature/update` or `fix/bug` are forbidden.

## Commit Message Convention (Conventional Commits)
All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to enable machine-readable Git history and future automated changelog generation.
- **Format:** `<type>(<optional scope>): <subject>`
- **Types:** `feat`, `fix`, `chore`, `docs`, `test`, `refactor`, `style`, `ci`
- **Subject Rules:** Imperative mood, lowercase first letter, no period at the end, maximum 72 characters.
- **Examples:**
  - `feat(frontend): add participant video grid component`
  - `fix(backend): resolve async deadlock in pipecat pipeline`
  - `docs: update README with GECX environment variables`
  - `test(backend): add reconnection failure tests for LiveKit`
- **Body (Optional):** If the subject line is insufficient, add a blank line followed by a body paragraph explaining the *why* behind the change.

## The Loop
1. PM creates the `task.md`.
2. Engineer creates branch using the naming convention above.
3. Engineer writes code, QA writes/runs tests.
4. Code is committed using Conventional Commits and pushed to the feature branch.
5. **Human Approval Gate**: Antigravity MUST pause execution and ask the user: "Feature complete and tests passing. Review branch `<branch-name>`. Approve squash merge to main?"
6. Only upon explicit human "Yes" will the Git Agent execute `git merge --squash` and push to main.

## Branch Hygiene
Stale branches clutter the remote and create confusion about active work.
- **Post-Merge Cleanup:** After a successful squash-merge to `main`, the agent must delete the remote feature branch: `git push origin --delete <branch-name>`.
- **Local Cleanup (Recommended):** Locally delete the merged branch: `git branch -d <branch-name>`. This is recommended but not enforced.
- **FORBIDDEN:** Never delete `main`, `staging`, or `production` branches under any circumstances.

## Conflict Resolution
Conflicts must be resolved cleanly before requesting merge approval.
- **Rebase-First:** Before requesting a squash merge, rebase the feature branch onto the latest `main` to incorporate any changes merged since the branch was created: `git fetch origin && git rebase origin/main`.
- **Conflict Handling:** If conflicts arise during rebase, resolve them manually, then re-run the full test suite to confirm zero regressions before proceeding to the merge approval gate.
- **FORBIDDEN:** Never force-push to `main`. Never auto-resolve conflicts by blindly accepting `--ours` or `--theirs` without reviewing each conflict.

## Regression Rollback Protocol
If a regression is discovered in `main` after a merge, follow this emergency path:
1. Immediately create a `fix/revert-<original-branch-name>` branch.
2. Execute `git revert <merge-commit-sha>` to create a clean revert commit.
3. Run the full test suite on the revert branch to confirm the regression is eliminated.
4. Fast-track through the `bug-fix` workflow (DoD gate still required) and request an expedited squash merge.
5. The original feature must then go through the full `build-feature` or `bug-fix` workflow again before re-merging.
