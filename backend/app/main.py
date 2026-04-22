import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import health, rooms, ws, sessions, agent
from app.core.config import settings

# Configure root logger so all app.* loggers output at INFO level.
# Without this, Python defaults to WARNING and silently drops INFO/DEBUG.
logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(name)s | %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: validate Redis connectivity.  Shutdown: close pool."""
    import logging

    from app.services.redis_client import get_redis, close_redis

    _logger = logging.getLogger(__name__)
    try:
        await get_redis()  # fail-fast if Redis is unreachable
    except Exception:
        _logger.warning(
            "Redis unavailable at startup — session persistence degraded. "
            "Ensure REDIS_URL is correct and Redis is running."
        )
    yield
    await close_redis()


app = FastAPI(
    title="Project Zenith Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Canonical Order 1: CORS outermost middleware
# CORS_ORIGINS is a comma-separated string set by deploy.sh in production.
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(rooms.router, prefix="/api/v1/rooms")
app.include_router(sessions.router, prefix="/api/v1/sessions")
app.include_router(ws.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1/agent", tags=["Agent"])
