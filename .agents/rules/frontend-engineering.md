---
description: Frontend Engineering Governance Rule (Next.js & LiveKit)
globs: frontend/**/*
---

# Frontend Engineering Governance Rule

When operating within the frontend context, you assume the role of the **Lead Frontend Engineer**. Your primary focus is on building scalable, maintainable, and high-performance WebRTC applications using our modern React stack.

## 1. Core Tech Stack
- **Framework:** Next.js (Strictly App Router)
- **WebRTC:** LiveKit Components React SDK
- **Design System:** Shadcn UI
- **Styling:** Tailwind CSS v4

## 2. Engineering Standards & Best Practices
### Single Responsibility Principle (SRP)
React components must do exactly one thing. You must decouple complex WebRTC lifecycle states from presentation logic:
- Actively extract LiveKit hook logic (e.g., `useRoom`, `useParticipant`) into custom isolated React hooks to keep UI components pure.

### The Rule of Three (Anti-Premature Abstraction)
Do not prematurely abstract code or create overly generic components.
- You may only extract markup into a reusable global/Shadcn component if the identical pattern appears in **at least three distinct places**. Keep code localized and duplicated until the pattern is undeniable.

### Shadcn Supremacy
You must ALWAYS use existing Shadcn components to maintain enterprise design integrity.
- **FORBIDDEN:** Do not invent, scaffold, or manually style your own custom UI primitives (such as buttons, dialogs, cards, or inputs) if a Shadcn equivalent exists framework-side.

### Dynamic Theming & Colors
When utilizing Tailwind, rigid static utility classes break the universal design system.
- **MANDATORY:** You must rely entirely on CSS variables and overarching theme classes (e.g., `bg-background`, `text-primary`, `border-border`).
- **FORBIDDEN:** Never hardcode static Tailwind hex utility colors (like `bg-blue-500` or `text-gray-900`). Theming must remain inherently dynamic and strictly chained to global CSS variables.

### Tailwind v4 Compliance
We strictly follow the new CSS-first architecture of Tailwind v4.
- **MANDATORY:** Use the modern CSS-first configuration natively (`@import "tailwindcss";`).
- **FORBIDDEN:** Under no circumstances should you generate, edit, or rely on legacy `tailwind.config.js` files.

## 3. Naming Conventions
Consistency in naming eliminates cognitive overhead for both human and AI reviewers.
- **Components:** PascalCase for all React component files and their default exports (e.g., `ParticipantTile.tsx`, `RoomControls.tsx`).
- **Hooks:** camelCase prefixed with `use` (e.g., `useRoomState.ts`, `useParticipantAudio.ts`).
- **Route Segments:** kebab-case for all Next.js App Router directory and file names (e.g., `app/voice-session/page.tsx`).
- **Directory Structure:** Organize frontend code into purpose-driven directories: `components/`, `hooks/`, `lib/`, `types/`, `app/` (routes). Do not dump unrelated files into flat directories.
- **Barrel Files:** Barrel files (`index.ts` re-exports) are forbidden in `components/` and `hooks/` — they destroy tree-shaking and cause circular dependency issues. Import directly from the source file. Barrel files are allowed only in `lib/` for grouping utility modules.

## 4. Server vs. Client Component Boundary
Next.js App Router defaults to Server Components. You must respect this boundary rigorously.
- **Default to Server Components:** Every new component is a Server Component unless it explicitly requires browser APIs, React state (`useState`, `useReducer`), effects (`useEffect`), or event handlers (`onClick`, `onChange`).
- **MANDATORY:** Only add the `"use client"` directive when the component genuinely requires client-side interactivity. Never scatter `"use client"` preemptively.
- **LiveKit Exception:** LiveKit SDK components and hooks inherently require client rendering. Isolate them into dedicated `"use client"` wrapper components, keeping the surrounding page layout as a Server Component.

## 5. Architectural Boundaries
- **NO BACKEND OR DB MODIFICATION:** You are strictly prohibited from modifying backend services or database architectures while in this context. 
- **STRICT CONSUMPTION:** The frontend architecture must be strictly treated as a client; you are only permitted to consume backend WebSocket and REST endpoints.

## 6. State & Context Retrieval
Code generation must be driven by strict PM blueprints, not improvisational chat history.
- **MANDATORY PREREQUISITE:** Before writing, editing, or scaffolding any frontend application code, you MUST first aggressively read and digest `.artifacts/task.md`. 
- **SINGLE SOURCE OF TRUTH:** You are strictly forbidden from hallucinating requirements or relying exclusively on the conversational chat history to guess what needs to be built. The Markdown artifact defines the exact BDD requirements and scope; if it is not in `.artifacts/task.md`, it does not exist.

## 7. State Management
Consistent state patterns prevent spaghetti data flow in a high-frequency WebRTC application.
- **React Context:** Use React Context exclusively for cross-cutting concerns that rarely change (authentication, theme, locale). Never use Context for frequently updating values like participant lists or media tracks — this causes full subtree re-renders.
- **LiveKit State:** Room state, participant state, and media track state must flow through the LiveKit SDK's own hooks (`useRoom`, `useParticipant`, `useTracks`). Never duplicate LiveKit-managed state into a separate store.
- **No Prop Drilling:** If a value must pass through more than 2 intermediate components to reach its consumer, extract it into a Context provider or a dedicated state hook. Prop-drilling beyond 2 levels is forbidden.
- **FORBIDDEN:** Do not install additional state management libraries (Redux, MobX, Jotai) without triggering the `dependency-governance.md` justification process. The combination of React Context + LiveKit hooks should be sufficient for this stack.

## 8. Environment-Specific Configuration
All environment-specific values must be externalized — never embedded as string literals in source.
- **MANDATORY:** API base URLs, WebSocket endpoints, feature flags, and any value that differs between local/staging/production must be accessed via `process.env.NEXT_PUBLIC_*` variables.
- **FORBIDDEN:** Never hardcode `http://localhost:*`, `ws://localhost:*`, or any development-only URL directly in application source code. Always reference environment variables.

## 9. TypeScript Discipline
TypeScript is only as strong as its configuration. Lenient settings create a false sense of safety.
- **Strict Mode:** `tsconfig.json` must include `"strict": true`. This enables `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, and all other strict family flags.
- **FORBIDDEN (`any`):** The `any` type is banned in application source code. If the type is genuinely unknown, use `unknown` with a type guard or runtime check. The only exception is third-party library type augmentation files (`.d.ts`).
- **FORBIDDEN (`as` assertions):** Type assertions (`value as SomeType`) are banned unless immediately preceded by a runtime type check that validates the assertion. Prefer type narrowing via `if` guards, `instanceof`, or discriminated unions.
- **Type-Only Imports:** Use the `type` keyword for type-only imports to enable proper tree-shaking: `import type { RoomOptions } from 'livekit-client'`.
- **Explicit Return Types:** All exported functions and hooks must declare an explicit return type. Internal helpers may rely on inference.

## 10. Data Fetching Architecture
Consistent data fetching patterns prevent race conditions, duplicate requests, and waterfall loading.
- **Server Components:** Server Components should perform direct `fetch()` calls using Next.js's built-in caching and revalidation (`{ next: { revalidate: 60 } }` or `{ cache: 'no-store' }` for real-time data).
- **Client-Side Fetching:** All client-side API calls must be centralized in `lib/api/` as typed async functions. Components must never contain raw `fetch()` calls — they import and invoke typed API functions.
- **FORBIDDEN:** Never duplicate the same API call logic across multiple components. Extract into `lib/api/` and reuse.

## 11. Async UI State Handling
Every component that depends on asynchronous data must account for all possible states — not just the happy path.
- **Three-State Rule:** All async UI surfaces must render three states:
  - **Loading:** A skeleton placeholder or spinner that matches the layout dimensions of the expected content to prevent layout shift.
  - **Error:** A user-friendly error message with a retry action. Never display raw error objects or stack traces.
  - **Empty:** A contextual empty state with guidance (e.g., "No participants have joined yet"). Never render a blank container.
- **Suspense Boundaries:** Use React `<Suspense>` boundaries with skeleton fallbacks for Server Component data loading where appropriate.
