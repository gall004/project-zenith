import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app

pytestmark = pytest.mark.asyncio

async def test_create_room_token():
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/v1/rooms/tokens", json={"room_name": "test-room", "participant_identity": "user-123"})
        
    assert response.status_code == 200
    json_data = response.json()
    assert "data" in json_data
    assert "error" in json_data
    assert json_data["error"] is None
    
    token_str = json_data["data"]["token"]
    assert isinstance(token_str, str)
    assert len(token_str) > 20
