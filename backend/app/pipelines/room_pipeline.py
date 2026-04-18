import asyncio
import logging
from typing import Dict, Any

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import TextFrame, Frame

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache of active pipelines by session/room ID
ACTIVE_PIPELINES: Dict[str, PipelineTask] = {}

class EventBusProcessor(FrameProcessor):
    def __init__(self, connection_manager):
        super().__init__()
        self.connection_manager = connection_manager

    async def process_frame(self, frame: Frame, direction: FrameDirection = FrameDirection.DOWNSTREAM):
        if isinstance(frame, TextFrame):
            logger.info(f"Intercepted LLM text: {frame.text}")
            await self.connection_manager.broadcast_agent_message(frame.text)
        await self.push_frame(frame, direction)

async def create_and_run_pipeline(room_name: str, token: str, connection_manager: Any):
    """
    US-01, US-02: Creates a Pipecat pipeline using LiveKitTransport and GeminiLiveLLMService.
    """
    logger.info(f"Creating Pipecat pipeline for room: {room_name}")
    
    transport = LiveKitTransport(
        api_key=settings.LIVEKIT_API_KEY,
        api_secret=settings.LIVEKIT_API_SECRET,
        url=settings.LIVEKIT_URL,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            video_in_enabled=True,
            video_out_enabled=False 
        )
    )

    llm = GeminiLiveLLMService(
        api_key=settings.GEMINI_API_KEY,
    )
    
    # US-07: Tool Call Intercept (Visual Context)
    @llm.register_function("request_visual_context")
    async def request_visual_context_handler(function_name, tool_call_id, args, llm, context, result_callback):
        logger.info(f"Intercepted tool call: {function_name}")
        await connection_manager.broadcast_event("enable_multimodal_input", {})
        # Fire result back to Gemini implicitly via result_callback or return
        if result_callback:
            await result_callback({"status": "success", "message": "Camera activated."})
        return {"status": "success", "message": "Camera activated."}

    # US-10: Human Escalation
    @llm.register_function("end_session")
    async def end_session_handler(function_name, tool_call_id, args, llm, context, result_callback):
        logger.info(f"Intercepted tool call: {function_name}")
        await connection_manager.broadcast_event("session_event", {"status": "escalated"})
        if result_callback:
            await result_callback({"status": "ended"})
        asyncio.create_task(stop_pipeline(room_name))
        return {"status": "ended"}
    
    event_bus_processor = EventBusProcessor(connection_manager)

    pipeline = Pipeline([
        transport.input(),
        llm,
        event_bus_processor,
        transport.output()
    ])

    task = PipelineTask(
        pipeline=pipeline,
        params=PipelineTask.Params()
    )

    ACTIVE_PIPELINES[room_name] = task

    try:
        logger.info(f"Connecting transport and running task for room {room_name}")
        await task.run()
    except asyncio.CancelledError:
        logger.info(f"Task for room {room_name} cancelled")
    except Exception as e:
        logger.error(f"Error in pipeline task {room_name}: {e}")
    finally:
        ACTIVE_PIPELINES.pop(room_name, None)
        logger.info(f"Pipeline task for room {room_name} finished")

async def stop_pipeline(room_name: str):
    """
    US-08: Terminates a pipeline
    """
    if task := ACTIVE_PIPELINES.get(room_name):
        logger.info(f"Stopping pipeline task for room {room_name}")
        task.cancel()
