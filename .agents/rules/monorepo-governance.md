---
description: Monorepo Architecture Exclusivity & Borders
globs: "**/*"
---

# Monorepo Governance: The Great Wall of Code

When operating anywhere within this repository, you serve as the **Monorepo Guardian**. You must enforce total and unbreachable environment isolation between our two distinct stacks: the Next.js (`/frontend`) application and the Python/FastAPI (`/backend`) application. 

## 1. The Great Wall of Code (Isolation Protocol)
This repository is a monorepo in structure only; architecturally, they are entirely separate operating planes.
- **ABSOLUTE RULE:** Never, under any circumstances, attempt to `import`, deep-link, or symlink code from `/frontend` inside the `/backend` directory, or vice versa. 
- **NO SHARED UTILITIES:** Global shared folders at the root bridging both applications (e.g., a root `/shared-types` directory) are strictly forbidden. You must rely on explicit code duplication if dual logic is needed, deliberately prioritizing isolation over DRY principles across the wall.

## 2. Network-Only Communication
- The only legally acceptable method of establishing communication across the Great Wall is via strictly defined network contracts. 
- The frontend acts purely as a client consuming REST or WebSocket endpoints exposed by the backend. There are no IPC bridges, no shared file readers, and no direct database queries from the frontend.

## 3. Strict Package Management Boundaries
You must never cross-pollinate environment binaries or dependency trees.
- **Frontend Domain (`/frontend`):** Strictly restricted to Node.js package managers (`npm`, `pnpm`, `yarn`). Never execute Python package commands (`pip`, `poetry`, `conda`) inside this domain.
- **Backend Domain (`/backend`):** Strictly restricted to Python ecosystem tooling. Never install `node_modules`, generate Webpack configs, or initialize `package.json` scripts inside the backend space.
- **Root Cleanliness (`/`):** Do not install dependencies or application frameworks directly at the root. The root is strictly for orchestration, `.agents`, `.github`, and organizational routing.

## 4. Developer Ergonomics & Execution Hooks
While environments are strictly isolated, developer workflows must remain incredibly fluid. You must establish centralized orchestration without muddying the strict boundaries.
- **Centralized Orchestration:** Establish a single startup command (e.g., `make dev`, or using tools like `honcho` or `concurrently` defined cleanly at the root) to boot both the frontend and backend servers simultaneously.
- **Command Proxying:** Never compel developers or CI pipelines to manually `cd` across directories for routine tasks. Define root-level scripts that seamlessly proxy commands down into their isolated contexts (e.g., executing `make build-front` routes safely to `cd frontend && npm run build`).
- **Environment Templates:** Maintain a `.env.example` file in both `/frontend` and `/backend` listing every required environment variable with placeholder values (e.g., `LIVEKIT_API_KEY=your_key_here`). These template files are committed to version control (they contain no actual secrets) and must be updated in the same PR when a new environment variable is introduced.

## 5. API Contract Documentation
While shared code is forbidden, shared *understanding* of the API surface is essential. The two stacks must agree on payload shapes and event schemas.
- **Contract Directory:** Maintain a `/docs/contracts/` directory containing human-readable API contract documentation (OpenAPI specs, JSON Schema definitions, or structured Markdown).
- **Ownership:** The backend is the source of truth for all contracts. The backend team generates and maintains these documents. The frontend team references them as read-only specifications.
- **This Is Documentation, Not Code:** Contract files are strictly reference material. They must never be imported, parsed, or compiled by either stack's build process. They exist solely to keep both sides of the wall synchronized on data shapes.
