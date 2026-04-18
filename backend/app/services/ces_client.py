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

    async def send_text(self, session_id: str, text: str) -> dict:
        """Send a text message to the CES agent and return the parsed response.

        Args:
            session_id: Unique session identifier (maps to room_name).
            text: The user's text message.

        Returns:
            A dict with keys:
                - "text": The agent's response text (or empty string).
                - "end_session": True if the agent signaled session termination.
                - "tool_calls": List of tool call dicts if the agent requested
                  client-side tool execution (for future sprint handling).
        """
        session_path = self._build_session_path(session_id)
        url = f"{_CES_API_BASE}/{session_path}:runSession"

        request_body = {
            "inputs": [
                {"text": text}
            ]
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

    def _parse_response(self, data: dict) -> dict:
        """Extract agent text, tool calls, and end_session from RunSessionResponse."""
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
        return result
