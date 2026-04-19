"""Session Management endpoints.

Exposes REST operations for managing the lifecycle of multimodal sessions,
such as explicitly terminating Pipecat pipelines when the user ends a session.
"""

from fastapi import APIRouter
import logging
from app.models.responses import StandardResponse

logger = logging.getLogger(__name__)

router = APIRouter()

@router.delete(
    "/{room_name}",
    response_model=StandardResponse[dict],
    summary="End an active session",
    tags=["Sessions"],
)
async def end_session(room_name: str):
    """Explicitly terminate a multimodal session and sever all pipelines."""
    from app.pipelines.room_pipeline import stop_pipeline, has_active_pipeline
    
    logger.info("Session end requested via API", extra={"room_name": room_name})
    
    if has_active_pipeline(room_name):
        await stop_pipeline(room_name)
        return StandardResponse(data={"status": "terminated", "room_name": room_name})
        
    return StandardResponse(data={"status": "not_found", "room_name": room_name})
