import asyncio
import logging
from typing import Dict, Any

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.frames.frames import Frame, LLMFullResponseEndFrame, LLMTextFrame, LLMContextFrame, TranscriptionFrame
from livekit import api
import pathlib

from app.core.config import settings
from app.models.websocket import Attachment

logger = logging.getLogger(__name__)

# Cache of active pipelines by session/room ID
ACTIVE_PIPELINES: Dict[str, PipelineTask] = {}

class EventBusProcessor(FrameProcessor):
    """Intercepts DOWNSTREAM LLM text frames and relays them to the chat UI.
    
    Must be placed DOWNSTREAM of the LLM in the pipeline.
    """
    def __init__(self, connection_manager, room_name):
        super().__init__()
        self.connection_manager = connection_manager
        self.room_name = room_name
        self._text_buffer = ""

    async def process_frame(self, frame: Frame, direction: FrameDirection = FrameDirection.DOWNSTREAM):
        await super().process_frame(frame, direction)
        
        if direction == FrameDirection.DOWNSTREAM:
            if isinstance(frame, LLMTextFrame):
                self._text_buffer += frame.text
            elif isinstance(frame, LLMFullResponseEndFrame):
                if self._text_buffer.strip():
                    logger.info(f"Intercepted LLM block: {self._text_buffer}")
                    await self.connection_manager.send_to_room_agent_message(self.room_name, self._text_buffer.strip())
                    self._text_buffer = ""
                
        await self.push_frame(frame, direction)


class TranscriptionInterceptor(FrameProcessor):
    """Intercepts UPSTREAM TranscriptionFrames from Gemini's input transcription.
    
    Must be placed UPSTREAM of the LLM in the pipeline (between transport.input
    and the LLM) so that upstream frames pushed by the LLM pass through it.
    """
    def __init__(self, connection_manager, room_name):
        super().__init__()
        self.connection_manager = connection_manager
        self.room_name = room_name

    async def process_frame(self, frame: Frame, direction: FrameDirection = FrameDirection.DOWNSTREAM):
        await super().process_frame(frame, direction)
        
        if direction == FrameDirection.UPSTREAM and isinstance(frame, TranscriptionFrame):
            if frame.text and frame.text.strip():
                logger.info(f"User transcription: {frame.text}")
                await self.connection_manager.send_to_room_user_transcription(
                    self.room_name, frame.text.strip()
                )
                
        await self.push_frame(frame, direction)


async def create_and_run_pipeline(room_name: str, connection_manager: Any, reason: str = None):
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
            audio_in_sample_rate=16000,
            audio_out_sample_rate=24000,
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

    # Prepend dynamic multimodal greeting context into the system instruction.
    context_prefix = (
        "IMPORTANT: The user has just joined a live multimodal WebRTC session "
        "with their camera and microphone active. "
    )
    if reason:
        context_prefix += (
            f"You explicitly requested this visual context for the following reason: "
            f"'{reason}'. Immediately greet the user enthusiastically, acknowledge "
            f"this specific reason, and smoothly transition to diagnosing their camera feed."
        )
    else:
        context_prefix += (
            "Immediately greet the user enthusiastically, confirming that you can "
            "see and hear them perfectly. Keep the greeting brief."
        )
    system_instruction = f"{context_prefix}\n\n{system_instruction}"
    logger.info(f"System instruction prepared ({len(system_instruction)} chars) with greeting context")

    llm = GeminiLiveLLMService(
        api_key=settings.GEMINI_API_KEY,
        system_instruction=system_instruction,
    )
    logger.info(
        f">>> LLM created: vad_disabled={llm._vad_disabled}, "
        f"ready_for_realtime_input={llm._ready_for_realtime_input}, "
        f"inference_on_context_initialization={llm._inference_on_context_initialization}"
    )
    
    # We removed the local `@llm.register_function` intercepts for end_session and
    # request_visual_context here because ADR-0002 shifted tool orchestration back 
    # to the Google Cloud CES REST Webhook. The webhook natively receives the tool 
    # executes via POST and dispatches WebSocket events downward.
    
    event_bus_processor = EventBusProcessor(connection_manager, room_name)
    transcription_interceptor = TranscriptionInterceptor(connection_manager, room_name)

    # Pipeline order matters:
    # - TranscriptionInterceptor sits between input and LLM to catch
    #   UPSTREAM TranscriptionFrames pushed by GeminiLiveLLMService
    # - EventBusProcessor sits between LLM and output to catch
    #   DOWNSTREAM LLMTextFrame/LLMFullResponseEndFrame
    pipeline = Pipeline([
        transport.input(),
        transcription_interceptor,
        llm,
        event_bus_processor,
        transport.output()
    ])

    task = PipelineTask(
        pipeline=pipeline,
        params=PipelineParams()
    )

    ACTIVE_PIPELINES[room_name] = task

    # Build the greeting message that will be sent as an LLMContextFrame.
    # This is critical: GeminiLiveLLMService._handle_context() -> _create_initial_response()
    # is the ONLY code path that sets _ready_for_realtime_input=True, which gates
    # whether _send_user_audio() actually sends audio to Gemini.
    # Without this, the LLM connects but silently drops all audio input.
    greeting_text = "I have successfully joined the room with my camera and microphone active."
    if reason:
        greeting_text += (
            f" You explicitly requested this visual context for the following reason: "
            f"'{reason}'. Please greet me enthusiastically and transition naturally "
            f"into helping me with that specific task."
        )
    else:
        greeting_text += (
            " Please greet me enthusiastically, confirming that you can see "
            "and hear me. Keep it incredibly brief."
        )
    
    initial_context = LLMContext(
        messages=[{"role": "user", "content": greeting_text}]
    )

    @transport.event_handler("on_first_participant_joined")
    async def on_first_participant_joined(transport, participant):
        await asyncio.sleep(1)  # Brief pause to allow WebRTC streams to settle
        logger.info(
            ">>> Injecting LLMContextFrame to trigger _handle_context -> "
            "_create_initial_response -> _ready_for_realtime_input=True"
        )
        context_frame = LLMContextFrame(context=initial_context)
        await task.queue_frames([context_frame])

    try:
        from pipecat.pipeline.runner import PipelineRunner
        runner = PipelineRunner()
        logger.info(f"Connecting transport and running task for room {room_name}")
        await runner.run(task)
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
        await task.cancel()


def has_active_pipeline(room_name: str) -> bool:
    """Check if a room has an active Pipecat pipeline (i.e., is escalated to Gemini Live)."""
    return room_name in ACTIVE_PIPELINES


async def inject_text_to_pipeline(room_name: str, text: str, attachments: list[Attachment] | None = None) -> bool:
    """Inject a typed chat message (and optional image attachments) into the active pipeline.
    
    Pushes an LLMMessagesAppendFrame which triggers _create_single_response
    on GeminiLiveLLMService. This generates a voice+text response from Gemini,
    making it feel like the user spoke the text.
    
    Returns True if the message was injected, False if no active pipeline.
    """
    task = ACTIVE_PIPELINES.get(room_name)
    if not task:
        return False
    
    from pipecat.frames.frames import LLMMessagesAppendFrame
    from openai.types.chat import ChatCompletionUserMessageParam

    content_parts = []
    if text:
        content_parts.append({"type": "text", "text": text})
        
    if attachments:
        for att in attachments:
            # Reconstruct the Data URI for Pipecat's OpenAI-compatible schema decoder
            # Note: Do not use VisionImageRawFrame per architectural constraint.
            content_parts.append({
                "type": "image_url",
                "image_url": {"url": f"data:{att.mime_type};base64,{att.data}"}
            })
            
    # Default to empty string if no text and no valid attachment parts
    content = content_parts if content_parts else text

    messages: list[ChatCompletionUserMessageParam] = [
        {"role": "user", "content": content}
    ]
    frame = LLMMessagesAppendFrame(messages=messages)
    await task.queue_frame(frame)
    logger.info(f"Injected text into Gemini Live pipeline for room {room_name}: {text[:80]}")
    return True
