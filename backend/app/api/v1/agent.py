from fastapi import APIRouter, Request, BackgroundTasks
import logging
from app.api.v1.ws import manager

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/webhook")
async def gecx_webhook(request: Request, background_tasks: BackgroundTasks):
    """
    Webhook target for Google Cloud CES / Dialogflow CX / Vertex AI.
    We receive the function call payloads here and route them to the active internal WebSockets.
    """
    payload = await request.json()
    logger.info(f"Received GECX webhook: {payload}")
    
    # Simple extractor: in Vertex/Dialogflow, parameters are in standard paths.
    # We will safely query the dictionary to avoid exceptions.
    
    # Dialogflow CX format: payload.get("sessionInfo", {}).get("parameters", {})
    session_info = payload.get("sessionInfo", {})
    parameters = session_info.get("parameters", {})
    
    # Support alternate placement in pageInfo or payload root
    if not parameters:
        parameters = payload.get("parameters", {})
        
    room_name = parameters.get("room_name")
    
    # We also need to know WHAT tool was called. Dialogflow passes the tag or intent
    # Vertex AI passes the tool call name.
    # We will extract it.
    intent_info = payload.get("intentInfo", {})
    display_name = intent_info.get("displayName", "")
    
    # If the tool name is natively passed in the payload (Vertex):
    action = payload.get("fulfillmentInfo", {}).get("tag", "")

    if not action:
        # Fallback to display name
        action = display_name
        
    # Hack for manual testing or simplified payloads
    if "action" in payload:
        action = payload["action"]
    if "room_name" in payload:
        room_name = payload["room_name"]

    if not room_name:
        logger.error("Missing room_name in webhook payload")
        return {"fulfillmentResponse": {"messages": [{"text": {"text": ["Error: missing room context"]}}]}}

    if "request_visual_context" in action:
        # Dispatch the visual toggle to the frontend via ConnectionManager
        await manager.trigger_multimodal_intercept(room_name)
        return {
            "fulfillmentResponse": {
                "messages": [
                    {"text": {"text": ["Camera successfully activated. I can now see you."]}}
                ]
            }
        }
    
    elif "end_session" in action:
        from app.pipelines.room_pipeline import stop_pipeline
        # Signal the UI that session ended
        import datetime
        from app.models.websocket import WebSocketEvent, WebSocketEventType
        event = WebSocketEvent(
            type=WebSocketEventType.SESSION_EVENT,
            payload={"status": "escalated"},
            timestamp=datetime.datetime.now(datetime.UTC).isoformat()
        )
        await manager.send_to_room_event(room_name, event.model_dump())
        
        # Stop Pipecat in the background
        background_tasks.add_task(stop_pipeline, room_name)
        return {
            "fulfillmentResponse": {
                "messages": [
                    {"text": {"text": ["Session escalated. Transferring you to a human agent."]}}
                ]
            }
        }

    return {"fulfillmentResponse": {"messages": [{"text": {"text": [f"Unknown action: {action}"]}}]}}
