import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.pipelines.room_pipeline import create_and_run_pipeline, stop_pipeline, ACTIVE_PIPELINES

@pytest.mark.asyncio
async def test_pipeline_dynamic_initialization():
    """Verify Pipeline dynamically initializes and inserts into ACTIVE_PIPELINES."""
    room_name = "test-room"
    mock_manager = AsyncMock()
    
    # Mock task run to prevent actual Pipecat execution blocking forever
    with patch("app.pipelines.room_pipeline.PipelineTask") as MockTask:
        mock_task_instance = MagicMock()
        mock_task_instance.run = AsyncMock()
        MockTask.return_value = mock_task_instance
        
        # Act
        await create_and_run_pipeline(room_name, mock_manager)
        
        # Assert
        assert mock_task_instance.run.called
        # The pipeline pops itself out in the finally block after run completes

@pytest.mark.asyncio
async def test_stop_pipeline():
    """Verify stop_pipeline correctly triggers cancellation on the task."""
    room_name = "test-room-stop"
    mock_task = MagicMock()
    mock_task.cancel = MagicMock()
    
    ACTIVE_PIPELINES[room_name] = mock_task
    
    await stop_pipeline(room_name)
    assert mock_task.cancel.called
    
    # Clean up state
    ACTIVE_PIPELINES.pop(room_name, None)
