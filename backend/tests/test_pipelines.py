import sys
import os
import asyncio
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from unittest.mock import AsyncMock, patch

@pytest.fixture
def mock_pipecat():
    with patch("app.pipelines.room_pipeline.Pipeline") as mock_pipeline:
        mock_pipeline.return_value = AsyncMock()
        mock_task = AsyncMock()
        with patch("app.pipelines.room_pipeline.PipelineTask", return_value=mock_task):
            yield mock_pipeline, mock_task

@pytest.mark.asyncio
async def test_room_pipeline_creation_and_run(mock_pipecat):
    from app.pipelines.room_pipeline import create_and_run_pipeline
    mock_pipeline, mock_task = mock_pipecat
    
    mock_manager = AsyncMock()
    with patch("app.pipelines.room_pipeline.LiveKitTransport"), patch("app.pipelines.room_pipeline.GeminiLiveLLMService"):
        await create_and_run_pipeline("test-room", mock_manager)
    
    mock_task.run.assert_called_once()

@pytest.mark.asyncio
async def test_event_bus_processor_intercepts_text():
    from pipecat.frames.frames import TextFrame
    from app.pipelines.room_pipeline import EventBusProcessor
    
    mock_bus = AsyncMock()
    processor = EventBusProcessor(mock_bus)
    
    frame = TextFrame("Hello Zenith")
    await processor.process_frame(frame)
    
    # Needs to process but also push frame down
    mock_bus.broadcast_agent_message.assert_called_once_with("Hello Zenith")
