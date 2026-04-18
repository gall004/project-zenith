---
name: governance-auditor
description: Self-healing audit protocol that ensures .agents governance stays synchronized with the project's evolving architecture.
---

# The Governance Auditor Skill

The governance framework is a living system, not a static document. When the project's architecture evolves — new stacks, replaced packages, major upgrades — the rules, workflows, and skills must evolve with it. This skill defines the protocol for detecting drift and proposing corrections.

## Trigger Conditions

This skill is **mandatory** when any of the following events occur during a `build-feature` or `refactor` workflow:

1. **Major Dependency Upgrade:** A core dependency undergoes a major version bump (e.g., React 19→20, FastAPI 0.x→1.x, Next.js 15→16, Tailwind v4→v5, Pipecat SDK major release).
2. **Technology Replacement:** A package or tool is replaced with an alternative (e.g., Redis → Valkey, Vitest → Jest, Ruff → Black, msw v1→v2 with breaking API changes).
3. **New Stack Introduction:** A new root-level directory representing a distinct technology stack is added to the monorepo (e.g., `/services/go-worker/`, `/infra/terraform/`).
4. **New Governance File:** The user manually creates a new `.agents/rules/`, `.agents/skills/`, or `.agents/workflows/` file — indicating the governance surface has expanded.
5. **Significant Dependency Addition:** The `dependency-governance.md` justification process is triggered for a production-critical package that introduces a new paradigm or architectural pattern (e.g., adding a message queue, a new ORM, a caching layer).

If none of these conditions are met, this skill is **skipped**.

## Audit Protocol

When triggered, execute the following checks in order:

### Phase 1: Rule Accuracy Scan
Read every file in `.agents/rules/` and verify:
- **Package References:** Do rules reference correct, current package names? (e.g., if `msw` was upgraded to v2, does `qa-engineering.md` still reference v1 API patterns?)
- **CLI Commands:** Are verification commands in rules still valid? (e.g., if `ruff` replaced `flake8`, do any rules still reference `flake8`?)
- **Version-Specific Guidance:** Do any rules reference version-specific behavior that has changed? (e.g., Tailwind v4 CSS-first config — if upgraded to v5, does the config pattern still apply?)
- **API Surfaces:** Do code examples or conventions reference APIs that have been deprecated or removed in the new version?

### Phase 2: Glob Coverage Verification
For every rule file in `.agents/rules/`:
- Verify the `globs:` pattern still matches the actual project directory structure.
- If a new stack directory was added (e.g., `/services/`), check if any existing rule should expand its glob, or if a new rule is needed.
- If a directory was renamed or removed, flag any rule whose glob references a non-existent path.

### Phase 3: DoD Gate Validation
Read `.agents/skills/dod-check/SKILL.md` and verify:
- All CLI verification commands (e.g., `npx tsc --noEmit`, `ruff check .`, `pytest --tb=short`) are still correct and reference the currently installed toolchain.
- Scan commands (e.g., `grep` targets for `console.log`, `print(`) still target the correct directory paths.
- Conditional skip paths (e.g., `frontend/src/components/`, `backend/app/api/`) still match the actual project structure.

### Phase 4: Workflow Coherence Check
Read every file in `.agents/workflows/` and verify:
- All rule file references (e.g., "Enforce `frontend-engineering.md`") point to files that still exist.
- Workflow steps still reflect the correct tool names and commands for the current stack.
- No workflow step references a deprecated pattern or removed technology.

### Phase 5: Coverage Gap Analysis
Assess whether the change introduced a gap that no existing rule covers:
- Does the new dependency or stack have unique conventions, patterns, or pitfalls that should be codified?
- Does the project now span a language or framework not addressed by any existing rule?
- Are there new security, performance, or accessibility implications that need governance?

## Output: Governance Drift Report

Produce a structured Markdown report with the following sections:

```markdown
# Governance Audit Report

## Trigger Event
[What change triggered this audit]

## Findings

### ✅ No Drift Detected
[List rules/skills/workflows that are still accurate]

### ⚠️ Drift Detected — Updates Required
[For each stale reference, specify:]
- **File:** [filename]
- **Section:** [section number and name]
- **Issue:** [what is stale or incorrect]
- **Proposed Fix:** [exact change needed]

### 🆕 New Coverage Needed
[Any new rules, skill sections, or workflow steps required]

## Recommended Actions
[Prioritized list of changes to propose to the user]
```

## Resolution Protocol

1. **Present the report** to the user for review. The agent must never auto-modify governance files without explicit human approval.
2. **Upon approval**, apply the proposed changes to the affected `.agents/` files.
3. **Commit governance updates** alongside the code changes that triggered the audit, using a Conventional Commit: `chore(governance): update rules for [trigger event description]`.
4. **If no drift is detected**, note "Governance audit passed — no updates required" in the commit body and proceed.

## Guardrails

- **FORBIDDEN:** Never delete a rule, skill, or workflow without explicit user instruction. Only propose additions or modifications.
- **Scope Constraint:** This skill audits governance files only. It must never modify application source code, tests, or documentation outside of `.agents/`.
- **User Sovereignty:** Every proposed governance change requires explicit human approval before application. The audit is advisory — the user decides what ships.
