---
description: Dependency Management & Supply Chain Governance
globs: "**/*"
---

# Dependency Management Governance

When adding, upgrading, or evaluating third-party packages, you must exercise extreme discipline. Every dependency is a liability — it increases attack surface, bundle size, and long-term maintenance burden.

## 1. Justification Before Installation
- **MANDATORY:** Before proposing any new `npm install` or `pip install`, you must first verify that the requirement cannot be satisfied by built-in language features, existing project dependencies, or a trivially small utility function written in-house.
- **Prefer Existing:** If the project already includes a library that partially covers the need (e.g., don't add `axios` if `fetch` or an existing HTTP client is already in use), extend the existing solution.

## 2. Package Health Criteria
Before adding a new dependency, verify the following:
- **Active Maintenance:** The package must have received a commit within the last 12 months.
- **Community Adoption:** Prefer packages with meaningful community adoption and established track records. Avoid obscure, unmaintained, or single-contributor packages for production-critical paths.
- **License Compatibility:** The package license must be compatible with commercial use (MIT, Apache 2.0, BSD). Flag any GPL or AGPL dependencies for explicit user review.
- **Security Vulnerabilities:** Before adding a dependency, verify it has no active critical or high-severity CVEs. If an existing dependency surfaces a vulnerability, it must be upgraded or replaced within 48 hours for critical severity. Run `npm audit` (frontend) or `pip audit` (backend) as part of dependency changes.

## 3. Version Pinning
- **Frontend (`package.json`):** Use exact versions for production dependencies (e.g., `"react": "19.1.0"`, not `"^19.1.0"`). Allow caret ranges only for `devDependencies`.
- **Backend (`requirements.txt` / `pyproject.toml`):** Pin exact versions for all production dependencies (e.g., `fastapi==0.115.0`).
- **Lock Files:** `package-lock.json` and equivalent lock files must always be committed to version control.

## 4. Dependency Hygiene
- **Audit Regularly:** When touching dependency files, check for and remove unused packages.
- **FORBIDDEN:** Never install packages globally as part of the application workflow. All dependencies must be project-local.
