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

                # Route text to CES agent via RunSession API
                try:
                    ces_response = await ces_client.send_text(
                        session_id=room_name,
                        text=chat_payload.text,
                    )
                    await manager.send_to_room_agent_message(
                        room_name, ces_response["text"]
                    )

                    # Handle end_session signal from CES agent
                    if ces_response.get("end_session"):
                        logger.info(
                            "ces_end_session",
                            extra={"room_name": room_name},
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
        from app.pipelines.room_pipeline import stop_pipeline
        import asyncio
        asyncio.create_task(stop_pipeline(room_name))
        await manager.disconnect(connection_id)
    except Exception:
        logger.exception(
            "ws_unexpected_error",
            extra={"connection_id": connection_id},
        )
        await manager.disconnect(connection_id)
