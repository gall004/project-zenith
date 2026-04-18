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


class WebhookRequest(BaseModel):
    """Schema for incoming CES tool webhook payloads."""

    action: str = Field(
        ..., description="The tool action identifier (e.g., 'request_visual_context')"
    )
    room_name: str = Field(
        ..., description="The room/session to target for the event dispatch"
    )
    reason: str = Field(
        default="", description="Optional reason for the action (logged for audit)"
    )


class WebhookResponse(BaseModel):
    """Standard webhook response."""

    status: str
    message: str


@router.post(
    "/webhook",
    response_model=WebhookResponse,
    summary="CES Tool Webhook",
)
async def ces_webhook(request: WebhookRequest) -> WebhookResponse:
    """Handle tool execution callbacks from the CES agent.

    The GECX agent in CX Agent Studio triggers this endpoint when
    it decides to execute an OpenAPI tool. Currently supported actions:

    - request_visual_context: Activates the frontend camera via WebSocket.
    - end_session: Signals session termination to the frontend.
    """
    logger.info(
        "ces_webhook_received",
        extra={"action": request.action, "room_name": request.room_name},
    )

    if "request_visual_context" in request.action:
        import asyncio
        from app.pipelines.room_pipeline import create_and_run_pipeline

        # dynamically initialize the multimodal pipeline strictly on visual escalation
        asyncio.create_task(create_and_run_pipeline(request.room_name, manager))

        await manager.trigger_multimodal_intercept(request.room_name)
        return WebhookResponse(
            status="success",
            message="Camera activation signal dispatched to frontend.",
        )

    elif "end_session" in request.action:
        import datetime

        from app.models.websocket import WebSocketEvent, WebSocketEventType

        event = WebSocketEvent(
            type=WebSocketEventType.SESSION_EVENT,
            payload={"status": "escalated"},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat(),
        )
        await manager.send_to_room_event(request.room_name, event.model_dump())
        return WebhookResponse(
            status="ended",
            message="Session termination signal dispatched.",
        )

    logger.warning(
        "ces_webhook_unknown_action",
        extra={"action": request.action},
    )
    return WebhookResponse(
        status="error",
        message=f"Unknown action: {request.action}",
    )
