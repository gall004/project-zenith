# End-to-End Feature Build: Chat Attachments

## Product Definition

**Goal:** Enable users to seamlessly upload and share file attachments (images) during active sessions, ensuring consistency whether routed to the standard GECX agent or the escalated Gemini Live multimodal brain.

### BDD Requirements

**Scenario 1: Uploading an attachment in a standard GECX session**
- **Given** a user is interacting with the standard text-based GECX agent
- **When** the user clicks the attachment icon and selects an image
- **Then** the image is previewed in the chat UI
- **And** upon sending, the image is uploaded to GCS and its `gs://` URI is passed to the CES `RunSession` API within the `sessionParameters` map.

**Scenario 2: Uploading an attachment in an escalated Gemini Live session**
- **Given** the user's session has been escalated to Gemini Live (Pipecat pipeline active)
- **When** the user selects an image and sends the message
- **Then** the backend decodes the attachment payload
- **And** it injects an `LLMMessagesAppendFrame` into Pipecat containing the user text and image contents (anchoring it in context without conflicting with LiveKit camera feeds).

**Scenario 3: Infrastructure management of GCS Resources**
- **Given** the application needs to store temporary user attachments
- **When** the Google Cloud environments are provisioned or torn down
- **Then** the `GCS_ATTACHMENT_BUCKET` is predictably created or destroyed alongside the GECX agent, utilizing variables stored in `.env`.

## Execution Status

- `[x] Setup git branch `feature/enable-attachments`
- `[x] Pre-flight checks (`pre-flight-check`)
- `[x] Configure GCS bucket deployment scripts and `.env.example`
- `[x] `backend/app/services/gcs_client.py` implementation
- `[x] `backend/app/api/v1/ws.py` & `models/websocket.py` protocol updates
- `[x] `backend/app/pipelines/room_pipeline.py` updates (Pipecat image injection)
- `[x] `backend/app/services/ces_client.py` updates (GCS routing)
- `[x] `frontend/components/ChatContainer.tsx` and types (UI Paperclip interaction)
- `[x] Execute DoD Checklist validation
