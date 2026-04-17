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
- **Action:** Wait for user approval. Once approved, trigger the `git-workflow` Skill to create the `feature/ticket-name` branch.

**Step 3: Test-Driven Development**
- **Action:** Act as the QA Lead (Apply rule: `qa-engineering.md`).
- **Task:** Read `.artifacts/task.md` and scaffold the required Pytest (backend) or Vitest (frontend) files. Ensure Arrange-Act-Assert (AAA) methodology.

**Step 4: Execution**
- **Action:** Build the application code. 
- **Task:** Apply `frontend-engineering.md` if touching `/frontend` (enforcing Tailwind v4 and LiveKit hooks) or `backend-engineering.md` if touching `/backend` (enforcing strict async purity for Pipecat). 

**Step 5: Verification & DoD Check**
- **Action:** Run the test suites. If they fail, fix the errors and re-run.
- **Task:** If tests pass, trigger the `dod-check` Skill to verify no dead code, strict types, and artifact sync.

**Step 6: Pull Request Approval**
- **Action:** Push the code to the feature branch.
- **Handoff:** Pause and ask the user: "Feature complete and DoD verified. Review branch feature/ticket-name. Approve squash merge to main?"
