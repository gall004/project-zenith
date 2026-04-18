---
description: Frontend Performance Budgets & Optimization
globs: frontend/**/*
---

# Frontend Performance Budgets Governance

When building or modifying frontend code, you must actively protect application performance. A bloated, slow-loading WebRTC application is a broken product regardless of feature completeness.

## 1. Bundle Size Discipline
- **Dynamic Imports:** Heavy components (LiveKit video grids, rich text editors, charting libraries) must be loaded via `next/dynamic` or `React.lazy()` with appropriate loading fallbacks. Never eagerly import heavyweight UI into the main bundle.
- **Tree-Shake Awareness:** Import only the specific modules you need (e.g., `import { Button } from "@/components/ui/button"`, not `import * as UI from "@/components/ui"`).
- **FORBIDDEN:** Never import entire icon libraries (e.g., `import * as Icons from "lucide-react"`). Import individual icons by name.

## 2. Image & Media Optimization
- **MANDATORY:** Always use the Next.js `<Image>` component over raw `<img>` tags. This enforces automatic lazy loading, responsive sizing, and format optimization (WebP/AVIF).
- **Explicit Dimensions:** All images must declare `width` and `height` (or use `fill` with a sized parent) to prevent Cumulative Layout Shift (CLS).

## 3. Rendering Performance
- **Minimize Re-Renders:** Memoize expensive computations with `useMemo` and stabilize callback references with `useCallback` when passing them as props to child components — particularly in LiveKit participant lists that update at high frequency.
- **Virtualization:** If rendering lists exceeding 50 items (e.g., chat messages, participant rosters), use a virtualization library (e.g., `@tanstack/react-virtual`) instead of rendering the full DOM.

## 4. Core Web Vitals Awareness
- **LCP Target:** Largest Contentful Paint must remain under 2.5 seconds. Do not block the critical rendering path with synchronous data fetches or unoptimized hero assets.
- **INP Target:** Interaction to Next Paint must remain under 200ms. Avoid long-running synchronous operations in event handlers.
