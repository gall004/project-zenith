import asyncio
import logging
from typing import Dict, Any

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.frames.frames import TextFrame, Frame
from livekit import api
import pathlib

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache of active pipelines by session/room ID
ACTIVE_PIPELINES: Dict[str, PipelineTask] = {}

class EventBusProcessor(FrameProcessor):
    def __init__(self, connection_manager, room_name):
        super().__init__()
        self.connection_manager = connection_manager
        self.room_name = room_name

    async def process_frame(self, frame: Frame, direction: FrameDirection = FrameDirection.DOWNSTREAM):
        if isinstance(frame, TextFrame):
            logger.info(f"Intercepted LLM text: {frame.text}")
            await self.connection_manager.send_to_room_agent_message(self.room_name, frame.text)
        await self.push_frame(frame, direction)

async def create_and_run_pipeline(room_name: str, connection_manager: Any):
    """
    US-01, US-02: Creates a Pipecat pipeline using LiveKitTransport and GeminiLiveLLMService.
    """
    logger.info(f"Creating Pipecat pipeline for room: {room_name}")
    
    agent_token = api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
    agent_token.with_identity(f"agent-{room_name}").with_name("Zenith Assistant")
    agent_token.with_grants(api.VideoGrants(room_join=True, room=room_name))
    jwt_token = agent_token.to_jwt()
    
    transport = LiveKitTransport(
        url=settings.LIVEKIT_URL,
        token=jwt_token,
        room_name=room_name,
        params=LiveKitParams(
            audio_in_enabled=True,
            audio_out_enabled=True,
            video_in_enabled=True,
            video_out_enabled=False 
        )
    )

    # US-12: GECX Brain Injection. Load the canonical instruction to configure the persona.
    prompt_path = pathlib.Path(__file__).parents[3] / "agent" / "gecx_agent" / "prompts" / "system_instruction.xml"
    if prompt_path.exists():
        system_instruction = prompt_path.read_text()
    else:
        logger.warning("GECX system_instruction.xml not found!")
        system_instruction = "You are Zenith, a helpful virtual assistant."

    llm = GeminiLiveLLMService(
        api_key=settings.GEMINI_API_KEY,
        system_instruction=system_instruction,
    )
    
    # We removed the local `@llm.register_function` intercepts for end_session and
    # request_visual_context here because ADR-0002 shifted tool orchestration back 
    # to the Google Cloud CES REST Webhook. The webhook natively receives the tool 
    # executes via POST and dispatches WebSocket events downward.
    
    event_bus_processor = EventBusProcessor(connection_manager, room_name)

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
