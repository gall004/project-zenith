# Feature Task: Architecture & Cost Breakdown Section

## Epic
Enhance the marketing landing page (`frontend/app/page.tsx`) to illustrate the explicit architectural trade-offs and session cost breakdowns between a Google-native lightweight approach vs the current heavyweight Pipecat/LiveKit portable solution.

## User Stories (BDD)

### Story 1: Architecture Comparison Display
**As a** prospective enterprise client or engineer evaluating Zenith
**I want to** read the explicit pros and cons of the chosen Pipecat transport layer vs a native Google Gemini web integration
**So that** I understand why the more complex, enterprise-ready path was chosen despite added transport complexity.

**Acceptance Criteria:**
- **Given** I am on the landing page
- **When** I scroll to the Architecture Deep Dive or new Architecture Section
- **Then** I should see a clean presentation summarizing "The Short Answer", "Why LiveKit + Pipecat Was Chosen", and "Did We Make Our Lives Harder?"
- **And** I should see a stylized comparison table illustrating "What A Google-Native Alternative Would Look Like" vs the Current Stack (Text Chat, Escalation, Audio/Video flow, Infrastructure).

### Story 2: Line-by-Line Cost Estimate Display
**As a** decision-maker evaluating Zenith
**I want to** see an illustrative line-by-line cost breakdown per session for both architectures
**So that** I can gauge the infrastructure overhead of the heavyweight portable solution (Pipecat + LiveKit) vs the lightweight direct proxy solution.

**Acceptance Criteria:**
- **Given** the Architecture Comparison section
- **When** I view the cost analysis module
- **Then** I should see an estimated cost-per-session analysis (based on industry benchmarks) separated by Lightweight vs Heavyweight architectures.
- **And** the Heavyweight cost breakdown should explicitly itemize "LiveKit Cloud bandwidth/minutes", "Server Compute (Pipecat process)", and "Gemini API usage".
- **And** the Lightweight breakdown should explicitly show only "Proxy Compute" and "Gemini API usage".

## Implementation Plan details to resolve:
1. Exact component placement inside `page.tsx` (e.g., underneath BentoGrid in a new full-width section).
2. Data structures for the comparison table.
3. Reasonable dummy/illustrative estimates for the Cost Analysis elements based on known cloud pricing.
