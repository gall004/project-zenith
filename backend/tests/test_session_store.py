"""Tests for the Redis-backed session store (US-02 — US-07).

Uses a mock Redis client so tests run without a live Redis instance.
"""

import sys
import os
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest

from app.models.session import SessionState, SessionStatus


# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------


def _fake_session(room: str = "session-abc123", identity: str = "user-test") -> SessionState:
    return SessionState(room_name=room, identity=identity)


class FakeRedis:
    """Minimal async Redis stub for testing session_store."""

    def __init__(self):
        self._store: dict[str, str] = {}
        self._lists: dict[str, list[str]] = {}
        self._ttls: dict[str, int] = {}

    async def set(self, key, value, ex=None):
        self._store[key] = value
        if ex:
            self._ttls[key] = ex

    async def get(self, key):
        return self._store.get(key)

    async def delete(self, *keys):
        count = 0
        for k in keys:
            if k in self._store:
                del self._store[k]
                count += 1
            if k in self._lists:
                del self._lists[k]
                count += 1
        return count

    async def rpush(self, key, value):
        self._lists.setdefault(key, []).append(value)

    async def lrange(self, key, start, stop):
        items = self._lists.get(key, [])
        if stop == -1:
            return items[start:]
        return items[start : stop + 1]

    async def ttl(self, key):
        return self._ttls.get(key, -2)

    async def expire(self, key, seconds):
        self._ttls[key] = seconds

    async def ping(self):
        return True

    async def scan_iter(self, match=None, count=None):
        for key in list(self._store.keys()):
            if match:
                import fnmatch
                if fnmatch.fnmatch(key, match):
                    yield key
            else:
                yield key


@pytest.fixture(autouse=True)
def mock_redis():
    """Patch get_redis to return a FakeRedis instance."""
    fake = FakeRedis()
    with patch("app.services.session_store.get_redis", new=AsyncMock(return_value=fake)):
        yield fake


# ---------------------------------------------------------------------------
# Session CRUD Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_session_generates_room_and_identity():
    from app.services.session_store import create_session

    session = await create_session()
    assert session.room_name.startswith("session-")
    assert session.identity.startswith("user-")
    assert session.status == SessionStatus.ACTIVE


@pytest.mark.asyncio
async def test_create_session_with_provided_identity():
    from app.services.session_store import create_session

    session = await create_session(identity="custom-user-42")
    assert session.identity == "custom-user-42"


@pytest.mark.asyncio
async def test_get_session_returns_none_for_missing():
    from app.services.session_store import get_session

    result = await get_session("nonexistent-room")
    assert result is None


@pytest.mark.asyncio
async def test_get_session_returns_created_session():
    from app.services.session_store import create_session, get_session

    created = await create_session(identity="lookup-test")
    retrieved = await get_session(created.room_name)
    assert retrieved is not None
    assert retrieved.room_name == created.room_name
    assert retrieved.identity == "lookup-test"


@pytest.mark.asyncio
async def test_update_session_modifies_fields():
    from app.services.session_store import create_session, update_session, get_session

    session = await create_session()
    updated = await update_session(
        session.room_name,
        status=SessionStatus.ESCALATED,
        escalation_data={"reason": "human requested"},
    )
    assert updated is not None
    assert updated.status == SessionStatus.ESCALATED
    assert updated.escalation_data == {"reason": "human requested"}

    # Verify persistence
    reloaded = await get_session(session.room_name)
    assert reloaded is not None
    assert reloaded.status == SessionStatus.ESCALATED


@pytest.mark.asyncio
async def test_update_session_returns_none_for_missing():
    from app.services.session_store import update_session

    result = await update_session("ghost-room", status=SessionStatus.ENDED)
    assert result is None


@pytest.mark.asyncio
async def test_delete_session_removes_state():
    from app.services.session_store import create_session, delete_session, get_session

    session = await create_session()
    deleted = await delete_session(session.room_name)
    assert deleted is True
    assert await get_session(session.room_name) is None


@pytest.mark.asyncio
async def test_delete_session_returns_false_for_missing():
    from app.services.session_store import delete_session

    result = await delete_session("already-gone")
    assert result is False


# ---------------------------------------------------------------------------
# Identity lookup
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_session_by_identity():
    from app.services.session_store import create_session, get_session_by_identity

    session = await create_session(identity="findable-user")
    found = await get_session_by_identity("findable-user")
    assert found is not None
    assert found.room_name == session.room_name


@pytest.mark.asyncio
async def test_get_session_by_identity_returns_none_for_unknown():
    from app.services.session_store import get_session_by_identity

    result = await get_session_by_identity("unknown-user")
    assert result is None


# ---------------------------------------------------------------------------
# Transcript Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_append_and_get_transcript():
    from app.services.session_store import (
        create_session,
        append_transcript,
        get_transcript,
    )

    session = await create_session()
    await append_transcript(session.room_name, "msg-1", "Hello", "user")
    await append_transcript(session.room_name, "msg-2", "Hi there!", "agent")

    transcript = await get_transcript(session.room_name)
    assert len(transcript) == 2
    assert transcript[0].id == "msg-1"
    assert transcript[0].sender == "user"
    assert transcript[1].id == "msg-2"
    assert transcript[1].sender == "agent"


@pytest.mark.asyncio
async def test_get_transcript_returns_empty_for_missing():
    from app.services.session_store import get_transcript

    transcript = await get_transcript("no-such-room")
    assert transcript == []


# ---------------------------------------------------------------------------
# Active session count
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_active_session_count():
    from app.services.session_store import create_session, get_active_session_count

    assert await get_active_session_count() == 0
    await create_session()
    assert await get_active_session_count() == 1
    await create_session()
    assert await get_active_session_count() == 2
