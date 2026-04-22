import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.ws import manager

client = TestClient(app)

@pytest.mark.asyncio
async def test_webhook_secure_token_routing(monkeypatch):
    """
    Simulate multiple active users in the system.
    The Orchestrator calls the webhook with a cryptographically secure token.
    The webhook should target the EXACT room matching the token in Redis.
    """
    # Mock multiple active connections
    manager._active_connections = {
        "stale-mobile-room": {"conn1": "mock-ws"},
        "active-desktop-room": {"conn2": "mock-ws"}
    }
    
    # Mock Redis to return the active-desktop-room for our token
    class MockRedis:
        async def get(self, key):
            if key == "webhook_token:secure123":
                return b"active-desktop-room"
            return None
            
    async def mock_get_redis():
        return MockRedis()
        
    import app.services.redis_client
    monkeypatch.setattr(app.services.redis_client, "get_redis", mock_get_redis)
    
    # Mock trigger_multimodal_intercept to track which room it was called for
    triggered_rooms = []
    async def mock_trigger(room_name):
        triggered_rooms.append(room_name)
        
    monkeypatch.setattr(manager, "trigger_multimodal_intercept", mock_trigger)

    # Mock session_store update_session
    import app.services.session_store as session_store
    async def mock_update_session(*args, **kwargs):
        pass
    monkeypatch.setattr(session_store, "update_session", mock_update_session)
    
    # Act
    response = client.post(
        "/api/v1/agent/webhook",
        json={"reason": "visual_requested", "token": "secure123"}
    )
    
    # Assert
    assert response.status_code == 200
    assert len(triggered_rooms) == 1
    
    # Assert it targeted the ACTIVE desktop room matching the token!
    assert triggered_rooms[0] == "active-desktop-room", "Webhook targeted the wrong session!"
