"""WebSocket endpoint for real-time bidirectional messaging (US-01, US-03).

Thin route handler that delegates all business logic to the service layer
per backend-engineering.md §3. Text messages are proxied to the CES agent
via RunSession; responses are pushed back to the client.
"""

import uuid
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.models.websocket import (
    ChatMessagePayload,
    ErrorPayload,
    WebSocketEvent,
    WebSocketEventType,
)
from app.services.connection_manager import ConnectionManager
from app.services.ces_client import CESClient
from app.services import session_store

logger = logging.getLogger(__name__)

router = APIRouter()
manager = ConnectionManager()
ces_client = CESClient()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, room_name: str) -> None:
    """Accept a WebSocket connection and process messages.

    Assigns a unique connection_id, registers the client, and enters
    a receive loop. Chat messages are forwarded to the CES agent via
    RunSession; agent responses are pushed back through the WebSocket.
    Malformed messages receive a structured error frame without crashing
    the connection (error-handling.md §1).
    """
    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, connection_id, room_name)

    try:
        while True:
            raw_data = await websocket.receive_json()

            try:
                event = WebSocketEvent.model_validate(raw_data)
            except ValidationError as validation_error:
                error_event = WebSocketEvent(
                    type=WebSocketEventType.ERROR,
                    payload=ErrorPayload(
                        code="INVALID_MESSAGE",
                        message=str(validation_error),
                    ).model_dump(),
                )
                await manager.send_to(
                    connection_id, error_event.model_dump()
                )
                continue

            if event.type == WebSocketEventType.CHAT_MESSAGE:
                try:
                    chat_payload = ChatMessagePayload.model_validate(
                        event.payload
                    )
                except ValidationError:
                    error_event = WebSocketEvent(
                        type=WebSocketEventType.ERROR,
                        payload=ErrorPayload(
                            code="INVALID_PAYLOAD",
                            message="chat_message requires a 'text' field",
                        ).model_dump(),
                    )
                    await manager.send_to(
                        connection_id, error_event.model_dump()
                    )
                    continue

                # Persist user message to Redis transcript
                import uuid as _uuid
                user_msg_id = f"msg-{_uuid.uuid4().hex[:12]}"
                await session_store.append_transcript(
                    room_name, user_msg_id, chat_payload.text, "user"
                )

                # Route text based on whether we're in a Gemini Live session
                from app.pipelines.room_pipeline import has_active_pipeline, inject_text_to_pipeline

                if has_active_pipeline(room_name):
                    # Escalated to Gemini Live — inject text and attachments into the pipeline
                    try:
                        injected = await inject_text_to_pipeline(
                            room_name, chat_payload.text, chat_payload.attachments
                        )
                        if not injected:
                            logger.warning(
                                "Pipeline disappeared between check and inject",
                                extra={"room_name": room_name},
                            )
                    except Exception as pipeline_error:
                        logger.exception(
                            "pipeline_inject_failed",
                            extra={"room_name": room_name},
                        )
                        error_event = WebSocketEvent(
                            type=WebSocketEventType.ERROR,
                            payload=ErrorPayload(
                                code="PIPELINE_ERROR",
                                message=f"Voice session error: {pipeline_error}",
                            ).model_dump(),
                        )
                        await manager.send_to(
                            connection_id, error_event.model_dump()
                        )
                else:
                    # Not escalated — route to CES agent (GECX)
                    try:
                        ces_response = await ces_client.send_text(
                            session_id=room_name,
                            text=chat_payload.text,
                            attachments=chat_payload.attachments,
                        )
                        logger.info("ces_response_received", extra={"response": ces_response})
                        
                        if ces_response["text"] and len(ces_response["text"].strip()) > 0:
                            await manager.send_to_room_agent_message(
                                room_name, ces_response["text"]
                            )

                        # Handle client-side tool calls from CES agent
                        tool_calls = ces_response.get("tool_calls", [])
                        for tool_call in tool_calls:
                            action_name = tool_call.get("action", "")
                            if action_name == "request_visual_context" or "request_visual_context" in tool_call.get("tool", ""):
                                args = tool_call.get("inputActionParameters", {})
                                pipeline_type = args.get("pipeline_type", "concierge")
                                reason = args.get("reason", "")
                                
                                logger.info(
                                    "Intercepted request_visual_context tool call",
                                    extra={"room_name": room_name, "pipeline": pipeline_type}
                                )
                                
                                import asyncio
                                from app.pipelines.room_pipeline import create_and_run_pipeline
                                multimodal_payload = {
                                    "reason": reason,
                                    "camera_requested": True,
                                    "microphone_requested": True,
                                    "pipeline_type": pipeline_type,
                                }
                                await session_store.update_session(
                                    room_name,
                                    multimodal_event=multimodal_payload,
                                )
                                
                                asyncio.create_task(
                                    create_and_run_pipeline(
                                        room_name, manager, reason=reason, pipeline_type=pipeline_type
                                    )
                                )
                                await manager.trigger_multimodal_intercept(room_name, payload=multimodal_payload)

                        # Handle end_session signal from CES agent
                        if ces_response.get("end_session"):
                            await session_store.update_session(
                                room_name, status="ended"
                            )
                            logger.info(
                                "ces_end_session",
                                extra={"room_name": room_name},
                            )
                            
                            import datetime
                            end_event = WebSocketEvent(
                                type=WebSocketEventType.SESSION_EVENT,
                                payload={"event": "ended"},
                                timestamp=datetime.datetime.now(datetime.UTC).isoformat()
                            )
                            await manager.send_to_room_event(
                                room_name, end_event.model_dump()
                            )

                    except Exception as ces_error:
                        logger.exception(
                            "ces_request_failed",
                            extra={
                                "room_name": room_name,
                                "connection_id": connection_id,
                            },
                        )
                        error_event = WebSocketEvent(
                            type=WebSocketEventType.ERROR,
                            payload=ErrorPayload(
                                code="CES_ERROR",
                                message=f"Agent unavailable: {ces_error}",
                            ).model_dump(),
                        )
                        await manager.send_to(
                            connection_id, error_event.model_dump()
                        )

    except WebSocketDisconnect:
        from app.pipelines.room_pipeline import stop_pipeline, has_active_pipeline
        import asyncio

        await manager.disconnect(connection_id)

        async def _graceful_stop_pipeline():
            """Wait 30s, then check Redis session + in-memory connections."""
            await asyncio.sleep(30)
            session = await session_store.get_session(room_name)
            still_active = session is not None and session.status.value == "active"
            has_ws = manager.has_room_connections(room_name)
            if not has_ws and still_active and has_active_pipeline(room_name):
                logger.info(
                    "Grace period elapsed without reconnection. Terminating pipeline.",
                    extra={"room_name": room_name},
                )
                await stop_pipeline(room_name)

        asyncio.create_task(_graceful_stop_pipeline())

    except Exception:
        logger.exception(
            "ws_unexpected_error",
            extra={"connection_id": connection_id},
        )
        await manager.disconnect(connection_id)
