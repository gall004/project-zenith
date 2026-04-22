"""CES Agent Webhook — OpenAPI tool endpoint for CX Agent Studio.

When the deployed GECX agent executes an OpenAPI tool (e.g.,
request_visual_context), CES sends an HTTP POST to this endpoint.
The webhook extracts the action and secure token, looks up the
associated room in Redis, and dispatches the appropriate event.

Per backend-engineering.md §3: Thin route handler, delegates to services.
"""

import logging
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException

from app.api.v1.ws import manager

logger = logging.getLogger(__name__)

router = APIRouter()


class VisualContextRequest(BaseModel):
    """Schema for incoming CES tool webhook payloads (request_visual_context)."""
    reason: str = Field(..., description="Reason the agent requested camera access")
    token: str = Field(..., description="Secure routing token to identify the session")
    pipeline_type: str | None = Field(default="concierge", description="Type of pipecat pipeline to run")

class VisualContextResponse(BaseModel):
    status: str
    message: str
    camera_enabled: bool

@router.post(
    "/webhook",
    response_model=VisualContextResponse,
    summary="CES Tool Webhook",
)
async def request_visual_context_endpoint(request: VisualContextRequest) -> VisualContextResponse:
    """Handle the request_visual_context OpenAPI tool execution.

    Uses a cryptographically secure token passed by the agent to
    deterministically route the webhook to the correct user session.
    """
    logger.info("ces_webhook_received", extra={"request": request.model_dump()})

    
    from app.services.redis_client import get_redis
    redis = await get_redis()
    
    # Lookup the room_name using the secure token
    room_bytes = await redis.get(f"webhook_token:{request.token}")
    if not room_bytes:
        logger.error("Invalid or expired webhook token received", extra={"token": request.token})
        raise HTTPException(status_code=403, detail="Invalid webhook token")
        
    room = room_bytes if isinstance(room_bytes, str) else room_bytes.decode("utf-8")
    
    import asyncio
    from app.pipelines.room_pipeline import create_and_run_pipeline
    from app.services import session_store

    # Write-before-emit: persist multimodal state to Redis
    multimodal_payload = {
        "reason": request.reason,
        "camera_requested": True,
        "microphone_requested": True,
        "pipeline_type": request.pipeline_type,
    }
    await session_store.update_session(
        room,
        multimodal_event=multimodal_payload,
    )

    # dynamically initialize the multimodal pipeline strictly on visual escalation
    asyncio.create_task(create_and_run_pipeline(room, manager, reason=request.reason, pipeline_type=request.pipeline_type))

    await manager.trigger_multimodal_intercept(room)
    return VisualContextResponse(
        status="success",
        message="Camera track enable signal dispatched to frontend.",
        camera_enabled=True
    )
