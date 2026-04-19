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
        # Map: room_name -> { connection_id -> WebSocket }
        self._active_connections: dict[str, dict[str, WebSocket]] = {}

    async def connect(
        self, websocket: WebSocket, connection_id: str, room_name: str
    ) -> None:
        """Accept and register a new WebSocket connection under a specific room."""
        await websocket.accept()
        if room_name not in self._active_connections:
            self._active_connections[room_name] = {}
        self._active_connections[room_name][connection_id] = websocket
        logger.info(
            "ws_connected",
            extra={"connection_id": connection_id},
        )

    async def disconnect(self, connection_id: str) -> None:
        """Remove a connection from the active pool."""
        for room_name, connections in list(self._active_connections.items()):
            if connection_id in connections:
                del connections[connection_id]
                if not connections:
                    del self._active_connections[room_name]
                logger.info(
                    "ws_disconnected",
                    extra={"connection_id": connection_id, "room": room_name},
                )
                return

    def has_room_connections(self, room_name: str) -> bool:
        """Check if a room currently has active websocket connections."""
        return room_name in self._active_connections and bool(self._active_connections[room_name])

    async def send_to(
        self, connection_id: str, message: dict
    ) -> bool:
        """Send a JSON message to a specific connection.

        Returns True if message was sent, False if connection not found.
        """
        websocket = None
        for room_name, connections in self._active_connections.items():
            if connection_id in connections:
                websocket = connections[connection_id]
                break

        if websocket is None:
            logger.warning(
                "ws_send_target_missing",
                extra={"connection_id": connection_id},
            )
            return False
        await websocket.send_json(message)
        return True

    async def broadcast(self, message: dict) -> None:
        """Send a JSON message to all active connections globally."""
        stale_ids: list[str] = []
        for room_name, connections in self._active_connections.items():
            for connection_id, websocket in connections.items():
                try:
                    await websocket.send_json(message)
                except Exception:
                    stale_ids.append(connection_id)
        for stale_id in stale_ids:
            await self.disconnect(stale_id)

    async def send_to_room_agent_message(self, room_name: str, text: str) -> None:
        """Send an agent response to a specific room and persist to Redis."""
        import datetime
        import uuid
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        from app.services import session_store
        
        msg_id = f"msg-{uuid.uuid4().hex[:12]}"
        await session_store.append_transcript(room_name, msg_id, text, "agent")
        
        event = WebSocketEvent(
            type=WebSocketEventType.AGENT_RESPONSE,
            payload={"text": text, "sender": "agent", "id": msg_id},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.send_to_room_event(room_name, event.model_dump())

    async def send_to_room_user_transcription(self, room_name: str, text: str) -> None:
        """Send a user speech transcription to a specific room and persist to Redis."""
        import datetime
        import uuid
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        from app.services import session_store
        
        msg_id = f"msg-{uuid.uuid4().hex[:12]}"
        await session_store.append_transcript(room_name, msg_id, text, "user")
        
        event = WebSocketEvent(
            type=WebSocketEventType.USER_TRANSCRIPTION,
            payload={"text": text, "sender": "user", "id": msg_id},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.send_to_room_event(room_name, event.model_dump())

    async def send_to_room_event(self, room_name: str, event_payload: dict) -> None:
        """Send a raw payload to a specific room."""
        if room_name not in self._active_connections:
            # no-op if no one is in the room
            return
            
        stale_ids: list[str] = []
        for connection_id, websocket in self._active_connections[room_name].items():
            try:
                await websocket.send_json(event_payload)
            except Exception:
                stale_ids.append(connection_id)
        for stale_id in stale_ids:
            await self.disconnect(stale_id)
            
    async def trigger_multimodal_intercept(self, room_name: str) -> None:
        """Helper to fire the explicit UI intercept"""
        import datetime
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        event = WebSocketEvent(
            type=WebSocketEventType.ENABLE_MULTIMODAL_INPUT,
            payload={"reason": "visual_requested"},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.send_to_room_event(room_name, event.model_dump())

    async def trigger_multimodal_end(self, room_name: str) -> None:
        """Helper to fire the explicit UI intercept to close multimodal feed"""
        import datetime
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        event = WebSocketEvent(
            type=WebSocketEventType.SESSION_EVENT,
            payload={"event": "multimodal_ended", "detail": "success"},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await self.send_to_room_event(room_name, event.model_dump())

    @property
    def active_count(self) -> int:
        """Return the number of active connections globally."""
        return sum(len(conns) for conns in self._active_connections.values())
