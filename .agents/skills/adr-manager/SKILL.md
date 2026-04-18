---
name: adr-manager
description: Generates formal Architecture Decision Records (ADRs) to document system-wide shifts.
---

# The Architecture Decision Record Skill

This skill guarantees we "Document Decisions, Not Just Code".

## Trigger Condition
Whenever a product requirement dictates a significant architectural shift—such as adding a new infrastructure component, switching a tech stack dependency, altering the database schema, or establishing a new networking pattern—the agent must generate an ADR.

## Execution Requirements
1. **Target Directory:** Store all ADRs in `/docs/architecture/adr/`.
2. **Naming Convention:** Use sequentially numbered markdown files (e.g., `0001-use-redis-for-room-state.md`).
3. **Template Structure:** The document must strictly contain the following sections:
   - **Title:** The core architectural decision.
   - **Status:** (Proposed / Accepted / Deprecated)
   - **Context:** The technical challenge, the business force, or the PM requirement driving the change.
   - **Decision:** The exact technical approach chosen.
   - **Alternatives Considered:** A brief evaluation of other approaches that were reviewed and rejected, including the specific reason each was dismissed (e.g., performance, complexity, licensing, maturity). This section prevents future agents from re-proposing already-rejected solutions and preserves institutional reasoning.
   - **Consequences:** The intended positive outcomes, alongside any technical debt or trade-offs (e.g., performance hits, complexity scaling) we are actively choosing to absorb.

Agents must commit these documents alongside the code utilizing the `git-manager` skill so architectural lore perfectly aligns with Git history.
