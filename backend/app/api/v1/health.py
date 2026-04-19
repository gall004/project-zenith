from fastapi import APIRouter, Response
from app.models.responses import StandardResponse, ErrorDetail

router = APIRouter()

@router.get("/health", response_model=StandardResponse[dict], summary="Health check", tags=["System"])
async def health_check(response: Response):
    """
    Standardized health probe for production readiness.
    Verifies connectivity to LiveKit and Redis.
    """
    import httpx
    import time
    from app.core.config import settings
    
    start_time = getattr(response, "state_start_time", time.time()) # Mock uptime
    uptime = int(time.time() - start_time)

    # 1. Check LiveKit
    livekit_status = "unreachable"
    try:
        # Livekit server normally responds to HTTP GET with a basic OK or similar on root
        async with httpx.AsyncClient(timeout=2.0) as client:
            httpUrl = settings.LIVEKIT_URL.replace("ws://", "http://").replace("wss://", "https://")
            res = await client.get(httpUrl)
            if res.status_code < 500:
                livekit_status = "connected"
    except Exception:
        pass

    # 2. Check Redis
    from app.services.redis_client import redis_health
    from app.services.session_store import get_active_session_count

    redis_check = await redis_health()
    redis_status = redis_check.get("redis", "error")

    active_sessions = 0
    if redis_status == "ok":
        try:
            active_sessions = await get_active_session_count()
        except Exception:
            pass

    dependencies_healthy = livekit_status == "connected" and redis_status == "ok"

    if not dependencies_healthy:
        response.status_code = 503
        return StandardResponse(
            error=ErrorDetail(code="SERVICE_UNAVAILABLE", message="Critical dependencies are unreachable"),
            data=None
        )

    data = {
        "service": "zenith-backend",
        "version": "1.0.0",
        "uptime": uptime,
        "dependencies": {
            "redis": redis_status,
            "livekit": livekit_status
        },
        "active_sessions": active_sessions,
    }

    return StandardResponse(data=data)
