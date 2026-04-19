"""Session Management endpoints (US-03, US-04, US-05, US-09).

REST operations for backend-owned session lifecycle.
All session state is persisted in Redis — the frontend hydrates
from these endpoints on mount, not from sessionStorage.
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.responses import StandardResponse
from app.models.session import (
    CreateSessionRequest,
    CreateSessionResponse,
    SessionState,
    TranscriptMessage,
)
from app.services import session_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "",
    response_model=StandardResponse[CreateSessionResponse],
    summary="Create or resume a session",
    tags=["Sessions"],
)
async def create_session(request: CreateSessionRequest):
    """Create a new session or resume an existing one.

    If the caller provides an ``identity`` that already has an active
    session, the existing session is returned (idempotent resume).
    Otherwise a fresh session is created.
    """
    if request.identity:
        existing = await session_store.get_session_by_identity(request.identity)
        if existing is not None:
            logger.info(
                "session_resumed",
                extra={"room_name": existing.room_name, "identity": existing.identity},
            )
            return StandardResponse(
                data=CreateSessionResponse(
                    room_name=existing.room_name,
                    identity=existing.identity,
                    status=existing.status,
                )
            )

    session = await session_store.create_session(identity=request.identity)
    return StandardResponse(
        data=CreateSessionResponse(
            room_name=session.room_name,
            identity=session.identity,
            status=session.status,
        )
    )


@router.get(
    "/{room_name}",
    response_model=StandardResponse[SessionState],
    summary="Hydrate session state",
    tags=["Sessions"],
)
async def get_session(room_name: str):
    """Return the full session state from Redis for frontend hydration.

    The frontend calls this on every mount (including after refresh)
    to restore identity, multimodal state, escalation data, and status.
    """
    session = await session_store.get_session(room_name)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return StandardResponse(data=session)


@router.get(
    "/{room_name}/transcript",
    response_model=StandardResponse[list[TranscriptMessage]],
    summary="Retrieve chat transcript",
    tags=["Sessions"],
)
async def get_transcript(room_name: str):
    """Return the full ordered chat transcript for a session.

    The frontend calls this on mount to hydrate the message list
    without relying on sessionStorage.
    """
    session = await session_store.get_session(room_name)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    transcript = await session_store.get_transcript(room_name)
    return StandardResponse(data=transcript)


@router.delete(
    "/{room_name}",
    response_model=StandardResponse[dict],
    summary="End an active session",
    tags=["Sessions"],
)
async def end_session(room_name: str):
    """Explicitly terminate a session: stop pipeline, purge Redis state."""
    from app.pipelines.room_pipeline import stop_pipeline, has_active_pipeline

    logger.info("Session end requested via API", extra={"room_name": room_name})

    if has_active_pipeline(room_name):
        await stop_pipeline(room_name)

    deleted = await session_store.delete_session(room_name)
    status = "terminated" if deleted else "not_found"
    return StandardResponse(data={"status": status, "room_name": room_name})
