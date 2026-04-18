---
name: build-feature
description: End-to-end agile development loop for Next.js/FastAPI/LiveKit features.
---

# Workflow: End-to-End Feature Build

**Step 1: Product Definition**
- **Action:** Act as the Lead Product Manager (Apply rule: `pm-governance.md`).
- **Task:** Read the user's initial prompt and generate/update `.artifacts/task.md` using strict BDD (Given/When/Then) formatting.
- **Handoff:** Pause and ask the user: "Do these requirements look correct?"

**Step 2: Git Initialization**
- **Action:** Wait for user approval. Once approved, trigger the `git-manager` Skill to create the `feature/ticket-name` branch.

**Step 2.5: Pre-Flight Check**
- **Action:** Trigger the `pre-flight-check` Skill.
- **Task:** Verify repository health: git state (correct branch, clean working tree), dependencies installed, both stacks build clean, environment files configured, existing test suite passes. If any check fails, stop and resolve before proceeding.

**Step 3: Test-Driven Development**
- **Action:** Act as the QA Lead (Apply rule: `qa-engineering.md`).
- **Task:** Read `.artifacts/task.md` and scaffold the required Pytest (backend) or Vitest (frontend) files. Ensure Arrange-Act-Assert (AAA) methodology.

**Step 4: Execution**
- **Action:** Build the application code. 
- **Task:** Apply `frontend-engineering.md` if touching `/frontend` (enforcing Tailwind v4 and LiveKit hooks) or `backend-engineering.md` if touching `/backend` (enforcing strict async purity for Pipecat). Simultaneously enforce `security-standards.md`, `clean-code.md`, and `error-handling.md`. If touching frontend UI, also enforce `accessibility.md` and `performance-budgets.md`. If installing new dependencies, enforce `dependency-governance.md`.

**Step 4.5: Architecture Decision Record (Conditional)**
- **Condition:** If this feature introduced a new infrastructure component, networking pattern, significant dependency, or fundamental design shift, this step is mandatory. Otherwise, skip.
- **Action:** Trigger the `adr-manager` Skill.
- **Task:** Generate an ADR in `/docs/architecture/adr/` documenting the Context, Decision, Alternatives Considered, and Consequences. The ADR must be committed alongside the feature code.

**Step 4.75: API Contract Sync (Conditional)**
- **Condition:** If this feature added, modified, or removed any backend API endpoint or Pydantic request/response schema, this step is mandatory. Otherwise, skip.
- **Action:** Enforce `api-contract.md` §7 and `monorepo-governance.md` §5.
- **Task:** Export the updated OpenAPI spec to `/docs/contracts/openapi.json`. If the change introduced a breaking contract modification (removed field, changed response shape), note it explicitly in the CHANGELOG and bump to a new API version per `api-contract.md` §2.

**Step 5: Verification & DoD Check**
- **Action:** Run the test suites. If they fail, fix the errors and re-run.
- **Task:** If tests pass, trigger the `dod-check` Skill to verify no dead code, strict types, security scan, contract sync, and artifact sync.

**Step 5.5: Governance Audit (Conditional)**
- **Condition:** If this feature introduced a major dependency upgrade, replaced a technology, added a new stack directory, or added a significant new production dependency, this step is mandatory. Otherwise, skip.
- **Action:** Trigger the `governance-auditor` Skill.
- **Task:** Execute the 5-phase audit (Rule Accuracy, Glob Coverage, DoD Validation, Workflow Coherence, Coverage Gaps). Present the Governance Drift Report to the user. Apply approved updates to `.agents/` files and commit alongside the feature code using `chore(governance): update rules for <trigger event>`.

**Step 6: Pull Request Approval**
- **Action:** Push the code to the feature branch.
- **Task:** Update `CHANGELOG.md` with an entry under `[Unreleased]` categorized as `Added`, `Changed`, `Fixed`, or `Removed` per `technical-writing.md` §3.
- **Handoff:** Pause and ask the user: "Feature complete and DoD verified. Review branch feature/ticket-name. Approve squash merge to main?"
