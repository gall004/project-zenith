import asyncio
from fastapi import APIRouter
from app.models.responses import StandardResponse
from app.models.rooms import TokenRequest, TokenResponseData
from app.core.config import settings
from livekit import api
from app.api.v1.ws import manager
from app.pipelines.room_pipeline import create_and_run_pipeline, stop_pipeline

router = APIRouter()

@router.post("/tokens", response_model=StandardResponse[TokenResponseData], summary="Generate LiveKit Token", tags=["Rooms"])
async def create_token(request: TokenRequest):
    """
    Generate a secure AccessToken for the LiveKit server and spawn the Pipecat pipeline (US-01).
    """
    token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(request.participant_identity).with_name(request.participant_name)
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=request.room_name,
    ))
    
    jwt_token = token.to_jwt()
    
    # Terminate existing pipeline for this room if any, then start a new one to prevent dupes
    await stop_pipeline(request.room_name)
    asyncio.create_task(create_and_run_pipeline(request.room_name, jwt_token, manager))
    
    return StandardResponse(data=TokenResponseData(token=jwt_token))
