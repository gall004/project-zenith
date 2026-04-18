from fastapi import APIRouter
from app.models.responses import StandardResponse
from app.models.rooms import TokenRequest, TokenResponseData
from app.core.config import settings
from livekit import api

router = APIRouter()

@router.post("/tokens", response_model=StandardResponse[TokenResponseData], summary="Generate LiveKit Token", tags=["Rooms"])
async def create_token(request: TokenRequest):
    """
    Generate a secure AccessToken for the LiveKit server.
    """
    token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    token.with_identity(request.participant_identity).with_name(request.participant_name)
    token.with_grants(api.VideoGrants(
        room_join=True,
        room=request.room_name,
    ))
    
    jwt_token = token.to_jwt()
    
    return StandardResponse(data=TokenResponseData(token=jwt_token))
