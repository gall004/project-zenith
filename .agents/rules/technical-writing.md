---
description: AI-First Code Documentation
globs: "**/*"
---

# AI-First Documentation Governance

Your technical writing within the codebase must act as breadcrumbs for the global multi-agent system. Documentation is written for humans *first*, but critically optimized for the next AI agent session that inherits the file context.

## 1. Agent-to-Agent Readability
- **MANDATORY:** All exported functions, Next.js components, React hooks, and FastAPI endpoints must be documented using strict JSDoc (frontend) or Python Docstring (backend) standards.
- **Contextual Depth:** Explicitly map expected parameters and strictly type the return values to provide instant contextual bridging to any agent that references the module later.

## 2. Document the 'Why', Not the 'What'
- Maintain the Principle of Least Astonishment (POLA).
- **FORBIDDEN:** Under no circumstances should you clutter the code with comments explaining standard language syntax (e.g., `// loop over users`).
- **MANDATORY:** Comments must exclusively outline *why* a decision was made. Document the business logic, the Edge Cases, external assumptions, or why a workaround was implemented.

## 3. Repository-Level Documentation Standards
Code documentation is necessary but insufficient. The repository itself must be self-documenting for onboarding and operational clarity.

### README.md (Root)
The root `README.md` must contain the following sections, kept current with each significant feature merge:
- **Project Overview:** A concise description of what Project Zenith is and its core architecture (Next.js + FastAPI + LiveKit + Pipecat).
- **Architecture Diagram:** A link or embedded reference to the current system architecture diagram (maintained in `docs/`).
- **Local Development Setup:** Step-by-step instructions for bootstrapping both frontend and backend environments, including prerequisite tooling.
- **Environment Variables:** A table listing every required environment variable, its purpose, which stack consumes it (`frontend` / `backend`), and whether it has a default value.

### CHANGELOG.md (Root)
- **MANDATORY:** Maintain a `CHANGELOG.md` following the [Keep a Changelog](https://keepachangelog.com/) format.
- **Update Cadence:** Every feature merge to `main` must include a corresponding CHANGELOG entry under the `[Unreleased]` section, categorized as `Added`, `Changed`, `Fixed`, or `Removed`.
- **Linkage:** Each entry should reference the relevant `task.md` requirement or feature branch name for traceability.

## 4. TODO/FIXME Governance
TODO and FIXME comments are deferred work — without governance, they accumulate as invisible, untracked tech debt.
- **Attribution Required:** Every `TODO:` and `FIXME:` comment must include the author identifier and a linked reference: `// TODO(nathan): Implement retry logic — see task.md §3.2`.
- **FORBIDDEN:** Naked `TODO:` or `FIXME:` comments with no context, attribution, or linked issue are banned. They provide no actionable information and decay into noise.
- **Ephemeral by Design:** TODOs are not permanent fixtures. If a TODO survives more than one release cycle without being resolved, it should be either implemented or deleted.
