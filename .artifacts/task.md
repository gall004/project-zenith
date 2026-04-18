# Task: Initial Next.js Frontend Scaffold

**Ticket:** `feature/nextjs-scaffold`
**Priority:** Foundation — must be completed before any other frontend feature work.

---

## P0 — Must Have

### US-01: Next.js App Router Initialization
- [x] **Given** the `frontend/` directory is empty,
  **When** the engineer scaffolds the Next.js application inside `frontend/`,
  **Then** a working Next.js project using the App Router (not Pages Router) is initialized with TypeScript in strict mode, and `npm run dev` starts the development server without errors.

### US-02: Tailwind CSS v4 Integration
- [x] **Given** the Next.js project exists in `frontend/`,
  **When** Tailwind CSS v4 is installed and configured,
  **Then** the global CSS file uses the CSS-first `@import "tailwindcss";` syntax (no legacy `tailwind.config.js`), and Tailwind utility classes render correctly in the browser.

### US-03: Shadcn UI Installation
- [x] **Given** Tailwind CSS v4 is configured and operational,
  **When** Shadcn UI is initialized in the project,
  **Then** the Shadcn CLI is configured (`components.json` exists), the default theme is applied, and at least one Shadcn component (e.g., `Button`) can be imported and rendered without errors.

### US-04: LiveKit Components React SDK Installation
- [x] **Given** the Next.js project exists with TypeScript strict mode,
  **When** the LiveKit Components React SDK (`@livekit/components-react`) and its peer dependency `livekit-client` are installed,
  **Then** the packages are listed in `package.json` with exact pinned versions, and a basic import of `@livekit/components-react` compiles without TypeScript errors.

### US-05: TypeScript Strict Mode Enforcement
- [x] **Given** the Next.js project has been scaffolded,
  **When** the engineer verifies `tsconfig.json`,
  **Then** `"strict": true` is enabled, and the project compiles cleanly with `npx tsc --noEmit` producing zero errors.

### US-06: Project Structure Compliance
- [x] **Given** the frontend scaffold is complete,
  **When** the engineer inspects the `frontend/` directory,
  **Then** the structure follows the governance-mandated layout:
    - `app/` — Next.js App Router route segments (kebab-case)
    - `components/` — React components (PascalCase)
    - `hooks/` — Custom React hooks (camelCase, `use` prefix)
    - `lib/` — Utility modules and API client functions
    - `types/` — Shared TypeScript type definitions
  And no barrel files (`index.ts`) exist in `components/` or `hooks/`.

---

## P1 — Should Have

### US-07: Root Layout and Metadata
- [x] **Given** the App Router is initialized,
  **When** the engineer inspects `app/layout.tsx`,
  **Then** a root layout exists with proper `<html>` and `<body>` tags, includes metadata (title, description) for SEO, loads a modern web font (e.g., Inter from Google Fonts via `next/font`), and applies the Shadcn/Tailwind theme classes to the body.

### US-08: Landing Page Placeholder
- [x] **Given** the root layout is configured,
  **When** a user navigates to `/` in the browser,
  **Then** a styled placeholder page renders confirming the stack is operational, displaying the project name and a brief status message. The page must use Shadcn components and Tailwind utilities — no raw HTML or inline styles.

### US-09: Environment Variable Architecture
- [x] **Given** the monorepo governance requires a single root `.env`,
  **When** the frontend needs environment-specific values,
  **Then** the root `.env.example` is updated with any new `NEXT_PUBLIC_*` variables required (e.g., `NEXT_PUBLIC_LIVEKIT_URL`), and no per-stack `.env` files exist inside `frontend/`.

---

## P2 — Nice to Have

### US-10: Dark Mode Support
- [x] **Given** Shadcn UI is initialized with CSS variables,
  **When** the application loads,
  **Then** the theme defaults to dark mode via the `dark` class on `<html>`, and all Shadcn components and Tailwind utilities respect the dark theme variables.
