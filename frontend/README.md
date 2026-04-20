# Frontend Domain: Project Zenith UI

This directory contains the user interface and client-side execution environment for Project Zenith, built on **Next.js**.

## Core Responsibilities

The `/frontend` domain acts strictly as the unprivileged client layer. It is responsible for:
1. **Real-time WebRTC Ingestion:** Connecting the user's local microphone and camera to the LiveKit server via the `@livekit/components-react` library.
2. **Visual Feedback:** Rendering agent state (speaking, listening, thinking) via Shadcn and Framer Motion micro-animations.
3. **Observability:** Rendering real-time analytical payloads (like sentiment analysis radar charts) using Recharts.

## Architecture

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS + Shadcn UI components (located in `/components/ui/`)
- **State Management:** React Context and native React Hooks (`useState`, `useCallback`)
- **WebRTC:** LiveKit React Components

### The "Great Wall" Pattern
Per the [Monorepo Governance](../../.agents/rules/monorepo-governance.md):
- **No Direct Logic Execution:** The frontend does not execute the Gemini AI, parse intent, or manage persistent session state. It simply emits audio/video frames over WebRTC and listens for strictly typed `multimodalEvents` from the backend via DataChannels.
- **REST APIs:** It communicates with the backend solely via explicit REST endpoints or the LiveKit server connection. No files or modules are ever imported from the `/backend`/ directory.

## Development

Do not run `npm run dev` directly within this directory unless you are strictly working on UI mockups that do not require backend agent APIs. See the root `README.md` for proper repository-wide orchestration (`make dev`).

**Environment configuration** flows continuously from the monorepo root `.env`. No stack-specific `.env.local` files should be maintained here.
