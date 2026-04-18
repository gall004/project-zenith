"""Tests for the CES Agent Client (RunSession proxy).

Validates session path construction, response parsing, and error handling
against the ces.googleapis.com/v1beta RunSession API contract.
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ces_client import CESClient


@pytest.fixture
def ces_client():
    """Create a CESClient with test config."""
    with patch("app.services.ces_client.settings") as mock_settings:
        mock_settings.GCP_PROJECT_ID = "test-project"
        mock_settings.CES_APP_ID = "test-app"
        mock_settings.CES_REGION = "us"
        client = CESClient()
    return client


class TestSessionPathConstruction:
    """Validates CES resource name generation."""

    def test_build_session_path(self, ces_client):
        """Given project/app/region, When building path, Then format is correct."""
        path = ces_client._build_session_path("my-session-123")
        assert path == "projects/test-project/locations/us/apps/test-app/sessions/my-session-123"

    def test_session_path_with_room_name(self, ces_client):
        """Given a room_name as session_id, When building path, Then it works."""
        path = ces_client._build_session_path("gecx-demo-engine")
        assert "sessions/gecx-demo-engine" in path


class TestResponseParsing:
    """Validates RunSessionResponse parsing."""

    def test_parse_text_response(self, ces_client):
        """Given a text output, When parsed, Then text is extracted."""
        raw = {
            "outputs": [
                {"text": "Hello from the agent!", "turnCompleted": True}
            ]
        }
        result = ces_client._parse_response(raw)
        assert result["text"] == "Hello from the agent!"
        assert result["end_session"] is False
        assert result["tool_calls"] == []

    def test_parse_multi_output_response(self, ces_client):
        """Given multiple outputs, When parsed, Then text is concatenated."""
        raw = {
            "outputs": [
                {"text": "Part one."},
                {"text": "Part two.", "turnCompleted": True},
            ]
        }
        result = ces_client._parse_response(raw)
        assert result["text"] == "Part one. Part two."

    def test_parse_end_session(self, ces_client):
        """Given endSession output, When parsed, Then end_session is True."""
        raw = {
            "outputs": [
                {"text": "Goodbye!", "endSession": {}, "turnCompleted": True}
            ]
        }
        result = ces_client._parse_response(raw)
        assert result["end_session"] is True
        assert result["text"] == "Goodbye!"

    def test_parse_tool_calls(self, ces_client):
        """Given toolCalls output, When parsed, Then tool_calls are extracted."""
        raw = {
            "outputs": [
                {
                    "toolCalls": {
                        "toolCalls": [
                            {
                                "tool": "projects/p/locations/l/apps/a/tools/visual_context",
                                "id": "tc-1",
                                "args": {"reason": "need camera"},
                            }
                        ]
                    },
                    "turnCompleted": True,
                }
            ]
        }
        result = ces_client._parse_response(raw)
        assert len(result["tool_calls"]) == 1
        assert result["tool_calls"][0]["id"] == "tc-1"

    def test_parse_empty_response(self, ces_client):
        """Given empty outputs, When parsed, Then defaults returned."""
        raw = {"outputs": []}
        result = ces_client._parse_response(raw)
        assert result["text"] == ""
        assert result["end_session"] is False
        assert result["tool_calls"] == []


@pytest.mark.asyncio
async def test_send_text_calls_api(ces_client):
    """Given valid inputs, When send_text called, Then API is hit with correct body."""
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "outputs": [{"text": "Agent says hi", "turnCompleted": True}]
    }
    mock_response.raise_for_status = MagicMock()

    with patch("app.services.ces_client.httpx.AsyncClient") as mock_httpx:
        mock_client_instance = AsyncMock()
        mock_client_instance.post.return_value = mock_response
        mock_httpx.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_httpx.return_value.__aexit__ = AsyncMock(return_value=False)

        with patch.object(ces_client, "_get_access_token", return_value="fake-token"):
            result = await ces_client.send_text("test-session", "Hello")

    assert result["text"] == "Agent says hi"
    mock_client_instance.post.assert_called_once()
    call_args = mock_client_instance.post.call_args
    assert ":runSession" in call_args[0][0]
    assert call_args[1]["json"]["inputs"] == [{"text": "Hello"}]
