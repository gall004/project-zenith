"""Pydantic schemas for the WebSocket message protocol (api-contract.md §4)."""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field
import datetime


class WebSocketEventType(str, Enum):
    """Strict enum of all valid WebSocket event types."""
    CHAT_MESSAGE = "chat_message"
    AGENT_RESPONSE = "agent_response"
    ENABLE_MULTIMODAL_INPUT = "enable_multimodal_input"
    SESSION_EVENT = "session_event"
    ERROR = "error"


class ChatMessagePayload(BaseModel):
    """Payload for user-originated chat messages."""
    text: str
    sender: str = "user"


class AgentResponsePayload(BaseModel):
    """Payload for agent-originated responses."""
    text: str
    sender: str = "agent"


class EnableMultimodalInputPayload(BaseModel):
    """Payload for triggering the frontend camera/mic intercept."""
    reason: str
    camera_requested: bool = True
    microphone_requested: bool = True


class SessionEventPayload(BaseModel):
    """Payload for session lifecycle events."""
    event: str
    detail: Optional[str] = None


class ErrorPayload(BaseModel):
    """Payload for structured WebSocket error frames."""
    code: str
    message: str


class WebSocketEvent(BaseModel):
    """
    Canonical WebSocket message envelope per api-contract.md §4.

    Every frame sent or received over the WebSocket MUST conform to this
    schema. The `type` field acts as the discriminant for payload parsing.
    """
    type: WebSocketEventType
    payload: dict
    timestamp: str = Field(
        default_factory=lambda: datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
    )
