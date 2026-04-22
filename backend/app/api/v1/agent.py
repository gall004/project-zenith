"""CES Agent Webhook — OpenAPI tool endpoint for CX Agent Studio (US-12).

When the deployed GECX agent executes an OpenAPI tool (e.g.,
request_visual_context), CES sends an HTTP POST to this endpoint.
The webhook extracts the action and room context, then dispatches
the appropriate event to the frontend via the ConnectionManager.

Per backend-engineering.md §3: Thin route handler, delegates to services.
"""

import logging
from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.api.v1.ws import manager

logger = logging.getLogger(__name__)

router = APIRouter()


class VisualContextRequest(BaseModel):
    """Schema for incoming CES tool webhook payloads (request_visual_context)."""
    reason: str = Field(..., description="Reason the agent requested camera access")
    session_id: str | None = Field(default=None, description="Target room name")
    pipeline_type: str | None = Field(default="concierge", description="Type of pipecat pipeline to run: 'concierge' or 'sentiment'")

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

    The GECX agent in CX Agent Studio triggers this endpoint when
    it decides to execute the request_visual_context OpenAPI tool.
    """
    logger.info("ces_webhook_received", extra={"request": request.model_dump()})
    
    room = request.session_id
    if not room:
        active_rooms = list(manager._active_connections.keys())
        room = active_rooms[0] if active_rooms else "gecx-demo-engine"
        logger.info("No session_id passed by Orchestrator, defaulting to active room", extra={"room": room})

    import asyncio
    from app.pipelines.room_pipeline import create_and_run_pipeline
    from app.services import session_store

    # Write-before-emit: persist multimodal state to Redis so a
    # simultaneous browser refresh always finds the current state.
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
