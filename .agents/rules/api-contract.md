---
description: API Design & Versioning Standards
globs: "**/*"
---

# API Design & Versioning Governance

When designing, implementing, or consuming HTTP REST or WebSocket endpoints that cross the Great Wall between frontend and backend, you must enforce strict contract standards to guarantee long-term stability and backward compatibility.

## 1. RESTful Naming Conventions
- **Resource-Oriented:** Endpoints must be named after resources using plural nouns, not actions (e.g., `/api/v1/rooms`, `/api/v1/participants`).
- **FORBIDDEN:** Never use verb-based endpoints like `/getRooms`, `/createSession`, or `/deleteUser`. Use HTTP methods (GET, POST, PUT, DELETE) to convey the action.
- **Kebab-Case:** Multi-word URL segments must use kebab-case (e.g., `/api/v1/voice-sessions`), not camelCase or snake_case.

## 2. API Versioning
- **MANDATORY:** All REST endpoints must be version-prefixed using the URL path strategy: `/api/v1/...`.
- **Breaking Changes:** If a change is backward-incompatible (removing a field, changing a response shape), it must be introduced under a new version (`/api/v2/...`).
- **Deprecation Protocol:** Deprecated endpoints must return a `Deprecation` header and remain functional for at least one full release cycle.

## 3. Standard Response Envelope
All JSON responses must follow a consistent envelope to enable predictable frontend parsing:
```json
{
  "data": {},
  "error": null,
  "meta": { "timestamp": "...", "request_id": "..." }
}
```
- Successful responses populate `data` and set `error` to `null`.
- Error responses populate `error` with `{ "code": "...", "message": "..." }` and set `data` to `null`.

## 4. WebSocket Event Naming
- **Namespaced Events:** LiveKit signaling and custom WebSocket events must follow a `domain:action` convention (e.g., `room:participant_joined`, `pipeline:transcription_ready`).
- **Payload Consistency:** Every WebSocket event payload must include a `type` field matching the event name and a `timestamp` field for ordering.

## 5. Pagination Standards
Collection endpoints must handle pagination predictably to prevent unbounded queries.
- **MANDATORY:** Any endpoint returning a list of resources must support pagination via query parameters: `?limit=` (max items per page) and either `?cursor=` (cursor-based) or `?page=` (offset-based).
- **Response Metadata:** The `meta` object in the response envelope must include pagination context: `total_count`, `limit`, and `next_cursor` (or `next_page`). If there are no more results, `next_cursor` / `next_page` must be `null`.
- **Default Limits:** If no `limit` parameter is provided, default to 20 items. Maximum allowed limit is 100 to prevent accidental full-table scans.

## 6. HTTP Status Code Standards
Use consistent status codes to enable predictable frontend error handling.
- `200 OK` — Successful retrieval or update.
- `201 Created` — Successful resource creation (POST). Include the created resource in the response body.
- `204 No Content` — Successful deletion. No response body.
- `400 Bad Request` — Malformed request syntax or invalid query parameters.
- `401 Unauthorized` — Missing or invalid authentication credentials.
- `403 Forbidden` — Authenticated but lacks permission for the requested resource.
- `404 Not Found` — Resource does not exist.
- `422 Unprocessable Entity` — Request body fails Pydantic validation.
- `429 Too Many Requests` — Rate limit exceeded. Include `Retry-After` header.
- `500 Internal Server Error` — Unhandled server exception. Never expose raw stack traces to the client.

## 7. OpenAPI & Auto-Documentation
FastAPI auto-generates an OpenAPI 3.x specification from your Pydantic models and route definitions. This is your living API documentation — treat it with the same rigor as application code.
- **Pydantic Models Are the Spec:** Every route handler must use explicit Pydantic `BaseModel` subclasses for request bodies and response models (via FastAPI's `response_model` parameter). Accurate Pydantic schemas directly produce accurate OpenAPI documentation. Never bypass this by accepting raw `dict` or `Any` types on public endpoints.
- **Descriptive Metadata:** All route handlers must include `summary`, `description`, and `tags` parameters for OpenAPI grouping and human readability (e.g., `@router.get("/rooms", summary="List active rooms", tags=["Rooms"])`).
- **Auto-Docs Availability:** FastAPI's built-in Swagger UI (`/docs`) and ReDoc (`/redoc`) endpoints must remain enabled in local development and staging environments for rapid frontend developer reference.
- **Production Security:** In production, auto-docs endpoints must be either disabled entirely or protected behind authentication. Never expose the full API surface map to unauthenticated users in production.
- **Contract Export:** When the API surface changes (new endpoints, modified schemas), export the updated OpenAPI JSON spec to `/docs/contracts/openapi.json` so the frontend team has an offline-readable, version-controlled reference per `monorepo-governance.md` §5.
