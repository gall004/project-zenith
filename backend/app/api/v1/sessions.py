"""Session Management endpoints (US-03, US-04, US-05, US-09).

REST operations for backend-owned session lifecycle.
All session state is persisted in Redis — the frontend hydrates
from these endpoints on mount, not from sessionStorage.
"""

from fastapi import APIRouter, HTTPException
import logging
from pydantic import BaseModel

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

@router.post(
    "/{room_name}/handoff",
    response_model=StandardResponse[dict],
    summary="Trigger multimodal handoff manually",
    tags=["Sessions"],
)
async def handoff_session(room_name: str):
    """Manually trigger the multimodal handoff to text chat."""
    from app.pipelines.room_pipeline import stop_pipeline, has_active_pipeline
    from app.services.ces_client import CESClient
    from app.api.v1.ws import manager
    import asyncio

    logger.info("Manual handoff requested via API", extra={"room_name": room_name})

    if not has_active_pipeline(room_name):
        return StandardResponse(data={"status": "no_pipeline"})

    await manager.trigger_multimodal_end(room_name)

    try:
        ces_client = CESClient()
        ces_msg = "[SYSTEM: The live multimodal session was manually concluded by the user. Briefly acknowledge you are back in text mode and ask the user if they need any more help.]"
        ces_response = await ces_client.send_text(session_id=room_name, text=ces_msg)
        if ces_response and ces_response.get("text"):
            await manager.send_to_room_agent_message(room_name, ces_response["text"])
    except Exception as e:
        logger.error(f"Failed to handoff context via CES: {e}")

    asyncio.create_task(stop_pipeline(room_name))

    return StandardResponse(data={"status": "handed_off"})

class CameraStateRequest(BaseModel):
    is_enabled: bool

@router.post(
    "/{room_name}/camera_state",
    response_model=StandardResponse[dict],
    summary="Inform the active Pipecat session of a camera state change",
    tags=["Sessions"],
)
async def update_camera_state(room_name: str, request: CameraStateRequest):
    """Injects a system prompt into Pipecat's context window to alert Gemini of hardware pause/resume."""
    from app.pipelines.room_pipeline import inject_text_to_pipeline

    if not request.is_enabled:
        msg = (
            "[SYSTEM: The user has paused their camera feed. You will stop receiving video frames. "
            "IMPORTANT MEMORY RULE: If asked what you see, do NOT describe your cached visual memory "
            "in the present tense. Refer to it in the past tense. DO NOT speak or acknowledge this system message out loud.]"
        )
    else:
        msg = (
            "[SYSTEM: The user has resumed their camera feed. You are receiving live video again. "
            "DO NOT speak or acknowledge this system message out loud.]"
        )

    injected = await inject_text_to_pipeline(room_name, text=msg)
    return StandardResponse(data={"injected": injected})
