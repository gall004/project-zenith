"""Pydantic models for backend-owned session state (US-02).

Every active session is persisted to Redis under ``session:{room_name}``
as a JSON blob conforming to :class:`SessionState`.  Chat transcripts
live in a companion Redis list at ``transcript:{room_name}``.
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class SessionStatus(str, Enum):
    """Lifecycle status of a session."""

    ACTIVE = "active"
    ESCALATED = "escalated"
    ENDED = "ended"


class SessionState(BaseModel):
    """Canonical session state persisted in Redis.

    Mirrors the fields previously scattered across frontend
    ``sessionStorage`` keys (zenith_identity, zenith_room,
    zenith_multimodal, zenith_escalation).
    """

    room_name: str
    identity: str
    status: SessionStatus = SessionStatus.ACTIVE
    multimodal_event: Optional[dict] = None
    escalation_data: Optional[dict] = None
    created_at: str = Field(
        default_factory=lambda: datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat()
    )


class TranscriptMessage(BaseModel):
    """A single chat message stored in the transcript list."""

    id: str
    text: str
    sender: str  # "user" | "agent"
    timestamp: str


class CreateSessionRequest(BaseModel):
    """POST /api/v1/sessions request body."""

    identity: Optional[str] = None


class CreateSessionResponse(BaseModel):
    """POST /api/v1/sessions response body."""

    room_name: str
    identity: str
    status: SessionStatus
