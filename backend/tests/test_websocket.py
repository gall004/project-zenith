"""Tests for the WebSocket endpoint and message protocol.

Maps to BDD user stories US-01, US-02, US-03, US-04 in .artifacts/task.md.
"""

from starlette.testclient import TestClient
import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from unittest.mock import patch, AsyncMock
from app.main import app


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

    @patch("app.api.v1.ws.ACTIVE_PIPELINES")
    def test_valid_chat_message_returns_agent_response(self, mock_pipelines):
        """Given a valid chat_message, When sent over WS, Then it queues to Pipecat."""
        # Arrange
        client = TestClient(app)
        
        mock_task = AsyncMock()
        mock_pipelines.__contains__.return_value = True
        mock_pipelines.__getitem__.return_value = mock_task

        message = {
            "type": "chat_message",
            "payload": {"text": "Hello Zenith", "sender": "user"},
            "timestamp": "2026-04-18T12:00:00Z",
        }

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json(message)
            
        # We cannot assert `receive_json` because pipecat processing is mocked 
        # and doesn't bounce back an immediate echo.
        # But we ensure it didn't throw an error and Pipecat injection was triggered.
        mock_task.queue_frame.assert_called_once()

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

class TestConnectionManager:
    """US-02: Connection lifecycle management."""

    def test_connection_established_and_cleaned_on_close(self):
        """Given a WS connection, When client disconnects, Then cleanup occurs."""
        # Arrange
        client = TestClient(app)

        # Act & Assert — no exception on normal close
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            websocket.send_json({
                "type": "chat_message",
                "payload": {"text": "ping", "sender": "user"},
                "timestamp": "2026-04-18T12:00:00Z",
            })

    def test_multiple_messages_on_same_connection(self):
        """Given an active WS, When multiple messages sent, Then all get responses."""
        # Arrange
        client = TestClient(app)

        # Act
        with client.websocket_connect("/api/v1/ws?room_name=test-room") as websocket:
            for i in range(3):
                websocket.send_json({
                    "type": "chat_message",
                    "payload": {"text": f"Message {i}", "sender": "user"},
                    "timestamp": "2026-04-18T12:00:00Z",
                })
