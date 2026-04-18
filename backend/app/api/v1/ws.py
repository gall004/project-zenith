"""WebSocket endpoint for real-time bidirectional messaging (US-01, US-03).

Thin route handler that delegates all business logic to the service layer
per backend-engineering.md §3.
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
from app.services.chat_handler import handle_chat_message

logger = logging.getLogger(__name__)

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Accept a WebSocket connection and process messages.

    Assigns a unique connection_id, registers the client, and enters
    a receive loop. Malformed messages receive a structured error frame
    without crashing the connection (error-handling.md §1).
    """
    connection_id = str(uuid.uuid4())
    await manager.connect(websocket, connection_id)

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

                response = await handle_chat_message(chat_payload.text)
                await manager.send_to(connection_id, response)

    except WebSocketDisconnect:
        await manager.disconnect(connection_id)
    except Exception:
        logger.exception(
            "ws_unexpected_error",
            extra={"connection_id": connection_id},
        )
        await manager.disconnect(connection_id)
