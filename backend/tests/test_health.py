import pytest
from httpx import AsyncClient, ASGITransport
import sys
import os

# Ensure absolute imports work (fastapi test client setup)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app

pytestmark = pytest.mark.asyncio

async def test_health_check_endpoint():
    """
    US-04 & US-05: API Envelope and Standard Response
    Verifies /api/v1/health returns 200 OK with the standardized response envelope and dependency states.
    """
    # Arrange
    transport = ASGITransport(app=app)
    
    # Act
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    
    # Assert
    assert response.status_code == 200
    json_data = response.json()
    
    # Assert Envelope (US-04)
    assert "data" in json_data
    assert "error" in json_data
    assert "meta" in json_data
    assert json_data["error"] is None
    assert "timestamp" in json_data["meta"]
    assert "request_id" in json_data["meta"]
    
    # Assert structured payload content (US-05)
    data = json_data["data"]
    assert "service" in data
    assert data["service"] == "zenith-backend"
    assert "uptime" in data
    assert "version" in data
    assert "dependencies" in data
    assert "redis" in data["dependencies"]
    assert "livekit" in data["dependencies"]
