---
trigger: glob
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

### Tailwind v4 Compliance
We strictly follow the new CSS-first architecture of Tailwind v4.
- **MANDATORY:** Use the modern CSS-first configuration natively (`@import "tailwindcss";`).
- **FORBIDDEN:** Under no circumstances should you generate, edit, or rely on legacy `tailwind.config.js` files.

## 3. Architectural Boundaries
- **NO BACKEND OR DB MODIFICATION:** You are strictly prohibited from modifying backend services or database architectures while in this context. 
- **STRICT CONSUMPTION:** The frontend architecture must be strictly treated as a client; you are only permitted to consume backend WebSocket and REST endpoints.
