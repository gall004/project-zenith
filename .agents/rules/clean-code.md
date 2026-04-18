---
description: Clean Code Principles
globs: "**/*"
---

# Clean Code & Refactoring Governance

When generating or modifying source code, you must universally adhere to strict clean computing principles to prioritize maintainability and prevent structural bloat.

## 1. KISS & YAGNI
- **Minimum Viable Code:** Actively forbid the creation of over-engineered abstractions or feature scopes not explicitly commanded in `.artifacts/task.md`. 
- **Keep It Simple, Stupid (KISS):** Prioritize raw readability and simplicity over clever one-liners or complex ternary structures.
- **You Aren't Gonna Need It (YAGNI):** Do not preemptively build functions, hooks, or endpoints "just in case" they are needed later. Code must directly serve the immediate requirement.

## 2. The Constrained Boy Scout Rule
Code inevitably degrades. You inherit a localized responsibility to leave the code cleaner than you found it, bound by aggressive Diff boundaries.
- **Micro-Optimization Only:** You may only optimize, refactor, and clean the exact blocks or lines of code you are actively modifying to satisfy the current `task.md`.
- **FORBIDDEN SCOPE CREEP:** You are absolutely forbidden from reformatting adjacent functions, auto-formatting unrelated files, or executing sweeping stylistic refactors. This aggressively preserves Git diff readability for the human reviewer.

## 3. Naming & Readability Standards
Code is read far more often than it is written. Names must communicate intent instantly.
- **Intention-Revealing Names:** Every variable, function, class, and module must have a descriptive name that reveals its purpose. A reader should never need to inspect the implementation to understand what a name represents.
- **FORBIDDEN:** Single-letter variable names are banned outside of trivial loop iterators (`i`, `j`, `k`). Generic placeholder names like `data`, `temp`, `result`, `value`, `item`, `stuff`, or `info` are forbidden unless genuinely describing a generic data container in a utility function.
- **Abbreviation Policy:** Do not abbreviate unless the abbreviation is a universally recognized domain term (e.g., `URL`, `API`, `WebRTC`, `WS`, `DB`). Write `participant` not `ptcp`, write `configuration` not `cfg`.
- **Boolean Naming:** Boolean variables and functions must read as natural-language assertions: `isConnected`, `hasPermission`, `shouldReconnect` — never `flag`, `status`, or `check`.
- **Magic Numbers Forbidden:** All numeric literals (except `0`, `1`, `-1` in trivially obvious contexts like loop initialization or increment) must be extracted into named constants. Write `const MAX_RETRY_ATTEMPTS = 3`, not inline `3`. This applies equally to timeouts, thresholds, array indices, and configuration values.

## 4. Size Discipline
Unbounded function and file lengths are a reliable signal of entangled responsibilities.
- **Maximum Function Length:** 50 lines per function or method body (excluding docstrings, type annotations, and blank lines). If a function exceeds this, decompose it into smaller, well-named helper functions.
- **Maximum File Length:** 300 lines per file. If a file exceeds this, extract cohesive sections into separate modules. React component files with extensive JSX may extend to 400 lines, but this must be the exception, not the norm.
- **Single Exit Principle (Relaxed):** Early returns for guard clauses and validation are encouraged to reduce nesting depth. However, avoid functions with more than 3 return paths — this signals the function is doing too much.
