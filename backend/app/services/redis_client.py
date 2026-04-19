"""Async Redis client singleton (US-01).

Provides a shared redis.asyncio connection pool for all backend services.
Initialised lazily on first access; health-checked at /api/v1/health.

The pool automatically reconnects on transient failures — callers never
need to handle connection lifecycle manually.
"""

import logging

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    """Return the shared async Redis client, creating it on first call.

    Uses ``redis[hiredis]`` for C-accelerated parsing.  The pool is
    configured with ``decode_responses=True`` so all values come back
    as ``str`` — callers never handle raw bytes.
    """
    global _pool  # noqa: PLW0603
    if _pool is None:
        logger.info("redis_init", extra={"url": settings.REDIS_URL})
        candidate = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        # Validate connectivity at startup
        try:
            await candidate.ping()
            logger.info("redis_connected")
        except Exception:
            logger.exception("redis_connection_failed")
            await candidate.aclose()
            raise
        _pool = candidate
    return _pool


async def close_redis() -> None:
    """Gracefully close the Redis connection pool on shutdown."""
    global _pool  # noqa: PLW0603
    if _pool is not None:
        await _pool.aclose()
        _pool = None
        logger.info("redis_closed")


async def redis_health() -> dict:
    """Return a health-check dict for the /health endpoint."""
    try:
        client = await get_redis()
        await client.ping()
        return {"redis": "ok"}
    except Exception as exc:
        return {"redis": "error", "detail": str(exc)}
