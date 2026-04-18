"""Chat message handler service (US-04).

Isolated echo handler for the PoC. The service layer pattern allows
this to be swapped for a GECX agent session without touching the route.
"""

import datetime

from app.models.websocket import (
    AgentResponsePayload,
    WebSocketEvent,
    WebSocketEventType,
)


# TODO(ngalloway, sprint-2): Replace with GECX agent session
async def handle_chat_message(text: str) -> dict:
    """Process an incoming chat message and return an agent response.

    In the PoC phase this returns a deterministic echo. Sprint 2 will
    replace this with the Gemini Multimodal Live API integration.
    """
    response_payload = AgentResponsePayload(
        text=f"Echo: {text}",
        sender="agent",
    )
    response_event = WebSocketEvent(
        type=WebSocketEventType.AGENT_RESPONSE,
        payload=response_payload.model_dump(),
        timestamp=datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat(),
    )
    return response_event.model_dump()
