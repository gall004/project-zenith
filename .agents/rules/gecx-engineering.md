---
description: GECX Agent Engineering Governance (CX Agent Studio & Prompt Architecture)
globs: agent/**/*
---

# GECX Agent Engineering Governance

When designing, configuring, or modifying the GECX Frontend Orchestrator agent deployed on CX Agent Studio, you must enforce the following architectural standards. These rules ensure behavioral reliability, auditability, and safe escalation in production customer-facing interactions.

## 1. Programmatic Instruction Following (PIF) Format

All GECX agent system instructions must be authored in structured XML using the PIF schema. Free-form prose instructions are forbidden — they produce inconsistent agent behavior and are not auditable.

### Mandatory PIF Sections
Every system instruction file must include the following XML sections in this exact order:

1. **`<role>`** — The agent's functional identity (e.g., "Customer Service Router", "Technical Specialist"). Must be a single declarative sentence.
2. **`<persona>`** — Behavioral traits defined as `<trait name="...">` elements. Each trait governs a specific dimension of the agent's communication style.
3. **`<constraints>`** — Hard behavioral boundaries defined as `<rule>` elements. These are non-negotiable prohibitions that the agent must never violate regardless of user input.
4. **`<taskflow>`** — The agent's decision tree, expressed as `<subtask>` and `<step>` elements. Each step must include:
   - `<trigger>`: The condition that activates this step.
   - `<action>`: The exact behavior the agent must execute.
   - `<tool_call>` (optional): If the step involves a tool invocation, the exact tool name and parameter template.
5. **`<escalation_protocol>`** — The human handoff procedure. Mandatory for all customer-facing agents.

### Formatting Rules
- **FORBIDDEN:** Free-form text blocks outside of PIF XML elements. All behavioral instructions must be scoped to a specific PIF section.
- **MANDATORY:** All `<step>` elements must have a unique `name` attribute for traceability in conversation logs.
- **MANDATORY:** System instruction files must be stored at `agent/gecx_agent/prompts/` with the `.xml` extension.

## 2. Multi-Agent Hierarchy (Divide and Conquer)

GECX deployments must follow a strict routing architecture. A single monolithic agent handling all customer intents is forbidden at scale.

### Architecture Pattern
- **Root Steering Agent:** The top-level agent that receives all inbound customer interactions. Its only job is intent classification and routing — it must never attempt to resolve complex queries directly.
- **Specialized Sub-Agents:** Domain-specific agents that handle a single category of inquiries (e.g., billing, hardware diagnostics, account management). Each sub-agent has its own PIF system instruction scoped to its domain.

### Routing Rules
- The Root Steering Agent must classify intent within the first 2 conversational turns.
- Routing to a sub-agent is implemented via CES toolsets (OpenAPI tools pointing to sub-agent webhook endpoints).
- If intent cannot be classified after 2 turns, the agent must ask one clarifying question. If still ambiguous after 3 total turns, escalate to a human per §4.

### Current State Exception
While the multi-agent hierarchy is the target architecture, a single-agent deployment is acceptable during the initial scaffold phase provided:
- The agent's `<taskflow>` explicitly documents which subtasks would be delegated to sub-agents in the target state.
- The system instruction includes a `<!-- FUTURE: delegate to sub-agent -->` comment at each delegation point.

## 3. Execution Callbacks (Programmatic Overrides)

CES agents support lifecycle callbacks that execute code at specific points in the agent's reasoning loop. These callbacks enable programmatic overrides that complement the LLM's instruction-following.

### Callback Points
- **Before LLM Call:** Fires before the LLM processes a user message. Use for input sanitization, PII redaction, or injecting runtime context (e.g., customer account data, session metadata).
- **After LLM Call:** Fires after the LLM generates a response but before it is sent to the user. Use for output validation, compliance filtering, or appending disclaimers.
- **Before Tool Call:** Fires before a tool is invoked. Use for parameter validation, rate limiting, or authorization checks.
- **After Tool Call:** Fires after a tool returns. Use for response transformation, logging, or triggering side effects.

### Implementation Rules
- Callbacks must be implemented as Python functions in `agent/gecx_agent/callbacks/`.
- Each callback function must be stateless — no persistent in-memory state across invocations.
- **FORBIDDEN:** Using callbacks to override the agent's core personality or conversational flow. Callbacks are for programmatic guardrails, not behavioral modification.
- **MANDATORY:** All callbacks must log their execution via structured logging (`logging.info`) for observability.

## 4. Human Escalation Protocol

Every customer-facing GECX agent must implement a standardized human escalation path. An AI agent that cannot hand off to a human is a liability.

### Escalation Trigger Conditions
The agent must escalate to a human when ANY of the following conditions are met:
1. The customer explicitly requests to speak to a human (e.g., "let me talk to a person").
2. The customer expresses frustration, anger, or distress that the agent cannot de-escalate within 2 attempts.
3. The query involves legal, medical, or financial advice.
4. The agent's confidence in its response is low (acknowledged via "I'm not sure" or equivalent).
5. The conversation exceeds 10 turns without resolution.

### Escalation Implementation
Escalation must use the CES `end_session` tool with the following standardized payload:

```json
{
  "session_escalated": true,
  "reason": "<ESCALATION_MESSAGE>",
  "transfer_target": "<PHONE_GATEWAY_TRANSFER>"
}
```

### Variable Definitions
- **`ESCALATION_MESSAGE`** — A human-readable summary of why the session is being escalated. Must include: the customer's original intent, actions already taken by the agent, and the specific trigger condition that caused escalation.
- **`PHONE_GATEWAY_TRANSFER`** — The telephony transfer destination. Must be configured via environment variable (`ESCALATION_PHONE_NUMBER`), never hardcoded. Format: E.164 international format (e.g., `+18005551234`).

### Agent Escalation Script
Before invoking `end_session`, the agent must say exactly:
> "I want to make sure you get the best help possible, so I'm connecting you with a member of our team. They'll have the full context of our conversation. One moment please."

- **FORBIDDEN:** Escalating silently without informing the customer.
- **FORBIDDEN:** Hardcoding phone numbers or transfer destinations in the system instruction or callback code.

## 5. Tool Schema Standards

All GECX agent tools must be defined as OpenAPI 3.0.3 YAML specifications stored in `agent/gecx_agent/tools/`.

- **Dynamic URL Injection:** Server URLs must use `${VARIABLE_NAME}` placeholders, never hardcoded URLs.
- **Full Schema Coverage:** Every tool must define complete request and response schemas with proper types, descriptions, and examples.
- **Versioning:** Tool schemas must include a `version` field in the `info` block. Breaking changes require a version bump.
