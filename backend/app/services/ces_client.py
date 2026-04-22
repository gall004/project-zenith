"""CES Agent Client — Stateless proxy to Google Cloud Customer Engagement Suite.

Wraps the RunSession API (ces.googleapis.com/v1beta) to send text messages
to the deployed GECX agent and return its responses.

Per backend-engineering.md §2: All I/O is async. No blocking calls.
Per backend-engineering.md §3: Service layer — no route logic here.
"""

import logging

from google.auth.transport import requests as google_auth_requests
from google.auth import default as google_auth_default
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_CES_API_BASE = "https://ces.googleapis.com/v1beta"


class CESClient:
    """Async client for CES RunSession API.

    Routes text messages to the deployed GECX agent and extracts
    the agent's text response. Session continuity is maintained
    by reusing the same session_id (mapped 1:1 to room_name).
    """

    def __init__(self) -> None:
        self._project_id = settings.GCP_PROJECT_ID
        self._app_id = settings.CES_APP_ID
        self._region = settings.CES_REGION

    def _build_session_path(self, session_id: str) -> str:
        """Build the CES session resource name.

        Format: projects/{project}/locations/{location}/apps/{app}/sessions/{session}
        """
        return (
            f"projects/{self._project_id}"
            f"/locations/{self._region}"
            f"/apps/{self._app_id}"
            f"/sessions/{session_id}"
        )

    async def _get_access_token(self) -> str:
        """Obtain an ADC access token for CES API calls."""
        credentials, _ = google_auth_default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(google_auth_requests.Request())
        return credentials.token

    async def send_text(self, session_id: str, text: str, attachments: list | None = None) -> dict:
        """Send a text message to the CES agent and return the parsed response.

        Args:
            session_id: Unique session identifier (maps to room_name).
            text: The user's text message.
            attachments: List of AttachmentPayload objects containing base64 data.

        Returns:
            A dict with keys:
                - "text": The agent's response text (or empty string).
                - "end_session": True if the agent signaled session termination.
                - "tool_calls": List of tool call dicts if the agent requested
                  client-side tool execution (for future sprint handling).
        """
        session_path = self._build_session_path(session_id)
        url = f"{_CES_API_BASE}/{session_path}:runSession"
        inputs_list = [{"text": text}]

        if attachments:
            for att in attachments:
                mime_type = att.mime_type
                b64_data = att.data
                
                # strip data uri prefix if present
                if "," in b64_data:
                    b64_data = b64_data.split(",")[1]

                inputs_list.append({
                    "image": {
                        "mimeType": mime_type,
                        "data": b64_data
                    }
                })

        import secrets
        webhook_token = secrets.token_hex(16)
        
        from app.services.redis_client import get_redis
        redis = await get_redis()
        # Token expires in 5 minutes (300 seconds)
        await redis.set(f"webhook_token:{webhook_token}", session_id, ex=300)

        # Inject token as a system metadata input before the user's message.
        # CX Agent Studio does not resolve sessionParameters into {variable_name}
        # template variables, so we pass the token inline for the agent to extract.
        inputs_list.insert(0, {"text": f"<system_metadata>webhook_token={webhook_token}</system_metadata>"})

        request_body = {
            "inputs": inputs_list,
        }

        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=request_body, headers=headers)
            response.raise_for_status()
            data = response.json()

        return self._parse_response(data)

    async def send_event(
        self,
        session_id: str,
        event_name: str,
        variables: dict | None = None,
    ) -> dict:
        """Send a structured event to the CES agent via RunSession.

        Uses the SessionInput `event` field (not `text`) per architecture
        guardrail: never send raw text to GECX for state transitions.

        Args:
            session_id: Unique session identifier (maps to room_name).
            event_name: The event name that triggers a CES agent handler.
            variables: Optional session parameters passed alongside the event
                       (e.g., {"vision_summary": "..."}).

        Returns:
            Parsed response dict with text, end_session, and tool_calls.
        """
        session_path = self._build_session_path(session_id)
        url = f"{_CES_API_BASE}/{session_path}:runSession"

        request_body: dict = {
            "inputs": [{"event": {"event": event_name}}],
        }
        if variables:
            request_body["sessionParameters"] = variables

        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=request_body, headers=headers)
            response.raise_for_status()
            data = response.json()

        return self._parse_response(data)

    def _parse_response(self, data: dict) -> dict:
        """Extract agent text, tool calls, and end_session from RunSessionResponse."""
        logger.debug("CES raw response: %s", data)

        result = {
            "text": "",
            "end_session": False,
            "tool_calls": [],
        }

        outputs = data.get("outputs", [])
        text_parts: list[str] = []

        for output in outputs:
            if output.get("text"):
                text_parts.append(output["text"])
            if "endSession" in output:
                result["end_session"] = True
            if output.get("toolCalls"):
                tool_calls = output["toolCalls"].get("toolCalls", [])
                result["tool_calls"].extend(tool_calls)

        result["text"] = " ".join(text_parts)
        logger.debug("CES parsed: text=%r, end_session=%s, tool_calls=%d",
                     result["text"], result["end_session"], len(result["tool_calls"]))
        return result
