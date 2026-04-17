---
name: dod-check
description: Enforces a strict Definition of Done rubric before squash-merge approval.
---

# The Deep "Definition of Done" (DoD)

To prevent the PM from prematurely celebrating, Antigravity needs a strict rubric. Before asking for the user's squash-merge approval, the system must verify:

## 1. Code Quality
No linting or TypeScript/Pyright type errors remain.

## 2. Testing
All unit and integration tests pass (specifically ensuring LiveKit connection handles drops/reconnects gracefully).

## 3. Documentation
The `README.md` or internal `docs/` have been updated with any new environment variables required for Pipecat/GECX.

## 4. No Dead Code
The codebase contains no `console.log`, commented-out code blocks, or unused Shadcn components.

## 5. Artifact Sync
The PM's `task.md` has all checkboxes explicitly marked complete.
