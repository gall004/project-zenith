---
name: spike
description: Time-boxed research and prototyping loop for exploratory investigations. No code ships to main.
---

# Workflow: Research Spike

**Step 1: Define the Research Question**
- **Action:** Read the user's exploratory question or investigation request.
- **Task:** Clearly articulate the research objective as a single, answerable question (e.g., "Can we replace Redis with LiveKit's built-in data channels for room state?" or "What is the optimal way to integrate Gemini streaming with Pipecat?").

**Step 2: Time-Box the Investigation**
- **Action:** Establish scope boundaries.
- **Task:** Spikes are investigation-only. Set a mental boundary: research the question, evaluate options, and document findings. Do not build production code, scaffold features, or modify application source during a spike.

**Step 3: Research & Prototyping**
- **Action:** Conduct the investigation.
- **Task:** Evaluate the technical feasibility by reading documentation, reviewing library APIs, testing small proof-of-concept snippets (in isolation, not in the production codebase), and assessing trade-offs. If prototyping is required, work in a throwaway scratch directory — never inside `frontend/` or `backend/`.

**Step 4: Document Findings**
- **Action:** Produce a structured findings document.
- **Task:** Create a Markdown file in `docs/spikes/` following this structure:
  - **Question:** The original research question.
  - **Summary:** A concise answer (1–3 sentences).
  - **Findings:** Detailed technical analysis, including benchmarks, API surface evaluation, and integration complexity.
  - **Alternatives Evaluated:** Each option considered, with pros, cons, and a clear winner.
  - **Recommendation:** The proposed path forward with justification.
  - **Next Steps:** If the spike concludes positively, outline the exact `build-feature` workflow invocation needed to implement the recommendation.

**Step 5: Present to User**
- **Handoff:** Present the findings document to the user. Pause and ask: "Here are the spike findings. Would you like to proceed with the recommendation and initiate a `build-feature` workflow?"
- **No Code Ships:** Spikes never merge to `main`. The findings document is the deliverable. If approved, the recommendation feeds into a standard `build-feature` or `refactor` workflow as a subsequent task.
