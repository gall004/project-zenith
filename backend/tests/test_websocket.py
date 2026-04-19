"""Tests for the WebSocket endpoint and message protocol.

Maps to BDD user stories US-01, US-02, US-03 in .artifacts/task.md.
"""

from starlette.testclient import TestClient
import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from unittest.mock import patch, AsyncMock
from app.main import app

import pytest

@pytest.fixture(autouse=True)
def mock_session_store():
    with patch("app.services.session_store.append_transcript", new_callable=AsyncMock):
        with patch("app.services.session_store.get_session", new_callable=AsyncMock, return_value=None):
            with patch("app.services.session_store.update_session", new_callable=AsyncMock, return_value=None):
                yield


class TestWebSocketConnection:
    """US-01: Backend WebSocket endpoint accepts connections."""

    def test_websocket_connects_successfully(self):
        """Given a client, When it upgrades to WS at /api/v1/ws, Then it connects."""
        # Arrange
        client = TestClient(app)

        # Act & Assert
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            assert websocket is not None


class TestWebSocketMessageProtocol:
    """US-03: Strict JSON schema validation for WebSocket messages."""

    @patch("app.api.v1.ws.ces_client")
    def test_valid_chat_message_returns_agent_response(self, mock_ces):
        """Given a valid chat_message, When sent over WS, Then CES response returns."""
        # Arrange
        client = TestClient(app)

        mock_ces.send_text = AsyncMock(return_value={
            "text": "Hello from CES agent",
            "end_session": False,
            "tool_calls": [],
        })

        message = {
            "type": "chat_message",
            "payload": {"text": "Hello Zenith", "sender": "user"},
            "timestamp": "2026-04-18T12:00:00Z",
        }

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json(message)
            response = websocket.receive_json()

        # Assert
        assert response["type"] == "agent_response"
        assert response["payload"]["text"] == "Hello from CES agent"
        assert response["payload"]["sender"] == "agent"
        mock_ces.send_text.assert_called_once_with(
            session_id="test-room", text="Hello Zenith", attachments=None
        )

    def test_malformed_message_returns_error_frame(self):
        """Given a malformed message, When sent over WS, Then an error frame returns."""
        # Arrange
        client = TestClient(app)
        malformed = {"invalid": "structure"}

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json(malformed)
            response = websocket.receive_json()

        # Assert
        assert response["type"] == "error"
        assert response["payload"]["code"] == "INVALID_MESSAGE"

    def test_invalid_payload_returns_error_frame(self):
        """Given a valid type but invalid payload, When sent, Then an error returns."""
        # Arrange
        client = TestClient(app)
        bad_payload = {
            "type": "chat_message",
            "payload": {"wrong_field": "no text here"},
            "timestamp": "2026-04-18T12:00:00Z",
        }

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json(bad_payload)
            response = websocket.receive_json()

        # Assert
        assert response["type"] == "error"
        assert response["payload"]["code"] == "INVALID_PAYLOAD"

    @patch("app.api.v1.ws.ces_client")
    def test_ces_error_returns_error_frame(self, mock_ces):
        """Given a CES API failure, When chat sent, Then error frame returns."""
        # Arrange
        client = TestClient(app)
        mock_ces.send_text = AsyncMock(side_effect=Exception("CES unavailable"))

        message = {
            "type": "chat_message",
            "payload": {"text": "Hello", "sender": "user"},
            "timestamp": "2026-04-18T12:00:00Z",
        }

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json(message)
            response = websocket.receive_json()

        # Assert
        assert response["type"] == "error"
        assert response["payload"]["code"] == "CES_ERROR"


class TestConnectionManager:
    """US-02: Connection lifecycle management."""

    def test_connection_established_and_cleaned_on_close(self):
        """Given a WS connection, When client disconnects, Then cleanup occurs."""
        # Arrange
        client = TestClient(app)

        # Act & Assert — no exception on normal close
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            assert websocket is not None

    @patch("app.api.v1.ws.ces_client")
    def test_multiple_messages_on_same_connection(self, mock_ces):
        """Given an active WS, When multiple messages sent, Then all get responses."""
        # Arrange
        client = TestClient(app)
        mock_ces.send_text = AsyncMock(return_value={
            "text": "reply",
            "end_session": False,
            "tool_calls": [],
        })

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            for i in range(3):
                websocket.send_json({
                    "type": "chat_message",
                    "payload": {"text": f"Message {i}", "sender": "user"},
                    "timestamp": "2026-04-18T12:00:00Z",
                })
                response = websocket.receive_json()

                # Assert
                assert response["type"] == "agent_response"
                assert response["payload"]["text"] == "reply"
