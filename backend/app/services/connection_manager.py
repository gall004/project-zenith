"""WebSocket connection lifecycle manager (US-02).

Tracks active WebSocket connections in-memory for the PoC scope.
All public methods are async to maintain pipeline compatibility
when migrating to Redis pub/sub in a future sprint.
"""

import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket client connections."""

    def __init__(self) -> None:
        self._active_connections: dict[str, WebSocket] = {}

    async def connect(
        self, websocket: WebSocket, connection_id: str
    ) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self._active_connections[connection_id] = websocket
        logger.info(
            "ws_connected",
            extra={"connection_id": connection_id},
        )

    async def disconnect(self, connection_id: str) -> None:
        """Remove a connection from the active pool."""
        removed = self._active_connections.pop(connection_id, None)
        if removed is not None:
            logger.info(
                "ws_disconnected",
                extra={"connection_id": connection_id},
            )

    async def send_to(
        self, connection_id: str, message: dict
    ) -> bool:
        """Send a JSON message to a specific connection.

        Returns True if message was sent, False if connection not found.
        """
        websocket = self._active_connections.get(connection_id)
        if websocket is None:
            logger.warning(
                "ws_send_target_missing",
                extra={"connection_id": connection_id},
            )
            return False
        await websocket.send_json(message)
        return True

    async def broadcast(self, message: dict) -> None:
        """Send a JSON message to all active connections."""
        stale_ids: list[str] = []
        for connection_id, websocket in self._active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception:
                stale_ids.append(connection_id)
        for stale_id in stale_ids:
            await self.disconnect(stale_id)

    async def broadcast_agent_message(self, text: str) -> None:
        """Send an agent response to all active connections."""
        import datetime
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        event = WebSocketEvent(
            type=WebSocketEventType.AGENT_RESPONSE,
            payload={"text": text, "sender": "agent"},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.broadcast(event.model_dump())

    async def broadcast_event(self, event_type: str, payload: dict) -> None:
        """Send a generic event to all connections (e.g. multimodal intercept)."""
        import datetime
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        event = WebSocketEvent(
            type=WebSocketEventType(event_type),
            payload=payload,
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.broadcast(event.model_dump())

    @property
    def active_count(self) -> int:
        """Return the number of active connections."""
        return len(self._active_connections)
