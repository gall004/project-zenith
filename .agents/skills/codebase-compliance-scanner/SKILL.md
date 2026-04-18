---
name: codebase-compliance-scanner
description: Retroactive audit that scans existing source code against current governance rules to identify tech debt and non-compliance.
---

# The Codebase Compliance Scanner Skill

The `governance-auditor` asks: *"Do the rules still match the project?"*
This skill asks the inverse: *"Does the project still match the rules?"*

When new governance rules are added or existing rules are strengthened, all pre-existing code is potentially non-compliant. This skill systematically identifies that tech debt and produces a prioritized remediation backlog.

## Trigger Conditions

This skill is triggered in two scenarios:

1. **Post-Governance Update:** After the `governance-auditor` skill modifies `.agents/` rule files, this skill should be offered to the user: "Governance rules were updated. Would you like to scan existing code for compliance with the new rules?"
2. **On-Demand:** The user explicitly requests a compliance audit (e.g., "Scan the codebase for rule violations" or "How compliant is our code?").

This skill is **never** triggered automatically during normal `build-feature` or `bug-fix` workflows — it is a standalone audit.

## Scan Protocol

For each rule file in `.agents/rules/`, scan the relevant source directories for violations. The scan is organized by rule file for traceability.

### Frontend Compliance (`frontend/src/`)

| Rule | What to Scan | Command / Check |
|------|-------------|-----------------|
| `frontend-engineering.md` §9 | `any` type usage | `grep -rn ": any\|as any\|<any>" frontend/src/ --include="*.ts" --include="*.tsx"` |
| `frontend-engineering.md` §3 | Barrel files in forbidden dirs | `find frontend/src/components frontend/src/hooks -name "index.ts" -o -name "index.tsx"` |
| `frontend-engineering.md` §8 | Hardcoded localhost URLs | `grep -rn "localhost\|127\.0\.0\.1" frontend/src/ --include="*.ts" --include="*.tsx"` |
| `clean-code.md` §4 | Functions exceeding 50 lines | Static analysis — count lines between function declarations |
| `clean-code.md` §3 | Magic numbers | `grep -rn "[^0-9][2-9][0-9]\{2,\}\|[^0-9][1-9][0-9]\{3,\}" frontend/src/` (heuristic — flag large inline numbers) |
| `performance-budgets.md` §1 | Wildcard icon imports | `grep -rn "import \* as.*from.*lucide\|import \* as.*from.*icons" frontend/src/` |
| `accessibility.md` §1 | div with onClick (non-semantic) | `grep -rn "<div.*onClick\|<span.*onClick" frontend/src/ --include="*.tsx"` |
| `error-handling.md` §2 | Missing Error Boundaries | Check if top-level route layouts have Error Boundary wrappers |

### Backend Compliance (`backend/app/`)

| Rule | What to Scan | Command / Check |
|------|-------------|-----------------|
| `backend-engineering.md` §2 | Synchronous blocking calls | `grep -rn "import requests\|time\.sleep\|from requests" backend/app/` |
| `backend-engineering.md` §7 | Raw SQL with string interpolation | `grep -rn "execute(f\"\|execute(.*%" backend/app/` |
| `error-handling.md` §1 | Bare except clauses | `grep -rn "except:\|except Exception:" backend/app/` |
| `security-standards.md` §2 | Ad-hoc os.environ usage | `grep -rn "os\.environ\|os\.getenv" backend/app/` |
| `clean-code.md` §4 | Files exceeding 300 lines | `find backend/app/ -name "*.py" -exec wc -l {} + | awk '$1 > 300'` |

### Cross-Stack Compliance

| Rule | What to Scan | Command / Check |
|------|-------------|-----------------|
| `technical-writing.md` §4 | Unattributed TODO/FIXME | `grep -rn "TODO\|FIXME" frontend/src/ backend/app/` — verify attribution |
| `clean-code.md` §3 | Forbidden variable names | `grep -rn "let data =\|let temp =\|let result =\|let value =" frontend/src/` |
| Dead code (DoD §4) | Console.log / print statements | `grep -rn "console\.log" frontend/src/` and `grep -rn "print(" backend/app/` |

## Output: Compliance Report

Produce a structured Markdown report:

```markdown
# Codebase Compliance Report

## Summary
- **Files Scanned:** 142
- **Violations Found:** 23
- **Critical (P0):** 4
- **Moderate (P1):** 11
- **Minor (P2):** 8

## Violations by Rule

### frontend-engineering.md §9 — TypeScript Discipline
**Severity:** P0 (type safety erosion)
| File | Line | Violation |
|------|------|-----------|
| `ParticipantTile.tsx` | 42 | `props: any` — use explicit interface |
| `useRoomState.ts` | 18 | `as RoomState` — unguarded type assertion |

### clean-code.md §4 — Size Discipline
**Severity:** P1 (maintainability)
| File | Lines | Limit |
|------|-------|-------|
| `pipeline.py` | 412 | 300 max |

### technical-writing.md §4 — TODO Governance
**Severity:** P2 (tech debt tracking)
| File | Line | Issue |
|------|------|-------|
| `auth.ts` | 67 | `// TODO: fix this` — no attribution |

## Remediation Backlog
1. **[P0]** Fix 4 `any` type violations → `refactor` workflow
2. **[P1]** Decompose 3 oversized files → `refactor` workflow
3. **[P2]** Add attribution to 8 TODOs → `chore` branch
```

## Severity Classification

- **P0 (Critical):** Type safety (`any`), security (hardcoded secrets, bare excepts, raw SQL), blocking calls in async context. These violations actively degrade system reliability.
- **P1 (Moderate):** Size limits, missing Error Boundaries, non-semantic HTML with handlers, wildcard imports. These create maintainability risk.
- **P2 (Minor):** Unattributed TODOs, forbidden variable names, magic numbers. These are style/hygiene issues.

## Resolution Protocol

1. **Present the report** to the user. The scan is informational — it never auto-fixes code.
2. **Upon user direction**, create individual `refactor` workflow tasks for P0 and P1 violations, grouped by file or module.
3. **P2 violations** may be addressed opportunistically via the Constrained Boy Scout Rule when those files are next modified.

## Guardrails

- **Read-Only:** This skill scans and reports. It never modifies source code.
- **No False Urgency:** Pre-existing violations are tech debt, not emergencies. They should be scheduled into the development cadence, not interrupt active feature work.
- **Heuristic Tolerance:** Some scan commands (e.g., magic number detection) are heuristic and may produce false positives. The agent must apply judgment and exclude obvious false positives from the report.
