---
description: WCAG 2.1 AA Accessibility Compliance
globs: frontend/**/*
---

# Accessibility Governance (WCAG 2.1 AA)

When building or modifying frontend UI, you must treat accessibility as a first-class engineering requirement, not a post-launch afterthought. All interactive surfaces must meet WCAG 2.1 Level AA compliance.

## 1. Semantic HTML
- **MANDATORY:** Use semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`, `<button>`, `<dialog>`) over generic `<div>` and `<span>` wrappers for interactive or structural content.
- **Headings:** Maintain a logical heading hierarchy (`h1` → `h2` → `h3`). Never skip heading levels for stylistic reasons.

## 2. ARIA Attributes
- **Interactive Elements:** All interactive Shadcn components (Buttons, Dialogs, Dropdowns, Tabs, Tooltips) must carry appropriate `aria-*` attributes (`aria-label`, `aria-expanded`, `aria-describedby`, `aria-live`).
- **LiveKit-Specific:** Video/audio participant tiles must include `aria-label` describing the participant name and media state (e.g., "Video tile for participant Nathan, microphone muted").
- **Rule of Preference:** If native HTML semantics already convey the role (e.g., `<button>`), do not redundantly add `role="button"`. Use ARIA to supplement, not to duplicate.

## 3. Keyboard Navigation
- **MANDATORY:** Every interactive element must be reachable and operable via keyboard alone (Tab, Enter, Escape, Arrow keys).
- **Focus Management:** When opening modals or dialogs, programmatically move focus into the dialog. When closing, return focus to the trigger element.
- **Visible Focus Indicators:** Never remove or hide the default focus outline (`outline: none`) without providing a visually equivalent custom focus style.

## 4. Color & Contrast
- **Minimum Contrast Ratio:** All text must meet a 4.5:1 contrast ratio against its background (3:1 for large text ≥18pt).
- **Never Rely on Color Alone:** Status indicators (e.g., "connected" vs. "disconnected") must use iconography, text labels, or patterns in addition to color to remain perceivable by color-blind users.

## 5. User Preference Respect
Modern browsers expose user preferences that must be honored for inclusive design.
- **Reduced Motion:** All CSS animations and transitions must be wrapped in a `@media (prefers-reduced-motion: no-preference)` guard. Users who prefer reduced motion must see static alternatives — no spinning loaders, sliding panels, or parallax effects.
- **Color Scheme:** The theme implementation must respect `prefers-color-scheme` as the default. Users may manually override, but the initial state must match their system preference.
