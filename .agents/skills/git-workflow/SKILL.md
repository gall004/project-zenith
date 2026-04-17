---
name: git-workflow
description: Enforces appropriate github governance. Governs how code moves from an idea to production.
---

# The Git & Orchestration Skill

Antigravity will use this skill to govern how code moves from an idea to production.

## The Law of the Branch
No agent is ever allowed to commit directly to main.

## The Loop
1. PM creates the `task.md`.
2. Engineer creates branch `feature/ticket-name`.
3. Engineer writes code, QA writes/runs tests.
4. Code is pushed to the feature branch.
5. **Human Approval Gate**: Antigravity MUST pause execution and ask the user: "Feature complete and tests passing. Review branch feature/ticket-name. Approve squash merge to main?"
6. Only upon explicit human "Yes" will the Git Agent execute `git merge --squash` and push to main.
