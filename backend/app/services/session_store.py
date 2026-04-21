"""Redis-backed session state CRUD (US-02 — US-07).

All session mutations go through this service layer.  The contract
is intentionally simple: get / create / update / delete / transcript ops.

Keys:
    session:{room_name}   — JSON blob of :class:`SessionState`
    transcript:{room_name} — Redis list of :class:`TranscriptMessage` JSON strings

Default TTL: 24 hours (86 400 seconds).
"""

from __future__ import annotations

import datetime
import logging
import uuid

from app.models.session import SessionState, SessionStatus, TranscriptMessage
from app.services.redis_client import get_redis

logger = logging.getLogger(__name__)

SESSION_KEY_PREFIX = "session:"
TRANSCRIPT_KEY_PREFIX = "transcript:"
DEFAULT_TTL_SECONDS = 86_400  # 24 hours


def _session_key(room_name: str) -> str:
    return f"{SESSION_KEY_PREFIX}{room_name}"


def _transcript_key(room_name: str) -> str:
    return f"{TRANSCRIPT_KEY_PREFIX}{room_name}"


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Session CRUD
# ---------------------------------------------------------------------------


async def create_session(identity: str | None = None) -> SessionState:
    """Create a new session and persist it to Redis.

    If *identity* is ``None`` a random one is generated.
    """
    redis = await get_redis()

    room_name = f"session-{uuid.uuid4().hex[:10]}"
    if identity is None:
        identity = f"user-{uuid.uuid4().hex[:8]}"

    session = SessionState(room_name=room_name, identity=identity)
    await redis.set(
        _session_key(room_name),
        session.model_dump_json(),
        ex=DEFAULT_TTL_SECONDS,
    )
    logger.info("session_created", extra={"room_name": room_name, "identity": identity})
    return session


async def get_session(room_name: str) -> SessionState | None:
    """Retrieve the session from Redis, or ``None`` if expired / missing."""
    redis = await get_redis()
    raw = await redis.get(_session_key(room_name))
    if raw is None:
        return None
    return SessionState.model_validate_json(raw)


async def get_session_by_identity(identity: str) -> SessionState | None:
    """Scan for an active session belonging to *identity*.

    This performs a Redis SCAN + GET for each candidate which is acceptable
    at enterprise scale because the session keyspace is bounded by
    concurrent users (typically < 10 000).  For >100 k concurrent users,
    add a secondary index: ``identity:{identity}`` → ``room_name``.
    """
    redis = await get_redis()
    async for key in redis.scan_iter(match=f"{SESSION_KEY_PREFIX}*", count=100):
        raw = await redis.get(key)
        if raw is None:
            continue
        session = SessionState.model_validate_json(raw)
        if session.identity == identity and session.status == SessionStatus.ACTIVE:
            return session
    return None


async def update_session(room_name: str, **fields: object) -> SessionState | None:
    """Merge *fields* into the existing session and persist.

    Returns the updated session, or ``None`` if the session doesn't exist.
    """
    session = await get_session(room_name)
    if session is None:
        return None

    update_data = {k: v for k, v in fields.items()}
    update_data["updated_at"] = _now_iso()
    updated = session.model_copy(update=update_data)

    redis = await get_redis()
    ttl = await redis.ttl(_session_key(room_name))
    if ttl < 0:
        ttl = DEFAULT_TTL_SECONDS

    await redis.set(
        _session_key(room_name),
        updated.model_dump_json(),
        ex=ttl,
    )
    logger.info("session_updated", extra={"room_name": room_name, "fields": list(update_data.keys())})
    return updated


async def delete_session(room_name: str) -> bool:
    """Delete a session and its transcript from Redis.

    Returns ``True`` if the session existed.
    """
    redis = await get_redis()
    result = await redis.delete(
        _session_key(room_name),
        _transcript_key(room_name),
    )
    if result > 0:
        logger.info("session_deleted", extra={"room_name": room_name})
    return result > 0


# ---------------------------------------------------------------------------
# Transcript operations
# ---------------------------------------------------------------------------


async def append_transcript(
    room_name: str,
    message_id: str,
    text: str,
    sender: str,
    timestamp: str | None = None,
) -> None:
    """Append a message to the session transcript list."""
    redis = await get_redis()

    msg = TranscriptMessage(
        id=message_id,
        text=text,
        sender=sender,
        timestamp=timestamp or _now_iso(),
    )
    await redis.rpush(_transcript_key(room_name), msg.model_dump_json())

    # Align transcript TTL with session TTL
    ttl = await redis.ttl(_session_key(room_name))
    if ttl > 0:
        await redis.expire(_transcript_key(room_name), ttl)


async def get_transcript(room_name: str) -> list[TranscriptMessage]:
    """Return the full ordered transcript for a session."""
    redis = await get_redis()
    raw_list = await redis.lrange(_transcript_key(room_name), 0, -1)
    return [TranscriptMessage.model_validate_json(item) for item in raw_list]


async def get_active_session_count() -> int:
    """Return approximate count of active sessions (for health endpoint)."""
    redis = await get_redis()
    count = 0
    async for _ in redis.scan_iter(match=f"{SESSION_KEY_PREFIX}*", count=100):
        count += 1
    return count
