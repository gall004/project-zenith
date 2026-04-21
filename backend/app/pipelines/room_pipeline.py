import asyncio
import logging
from typing import Dict, Any

from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.task import PipelineTask, PipelineParams
from pipecat.transports.livekit.transport import LiveKitTransport, LiveKitParams
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.processors.frame_processor import FrameProcessor, FrameDirection
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.frames.frames import Frame, LLMFullResponseStartFrame, LLMFullResponseEndFrame, LLMTextFrame, LLMContextFrame, TranscriptionFrame
from livekit import api
import pathlib

from app.core.config import settings
from app.models.websocket import Attachment
from app.services.ces_client import CESClient

logger = logging.getLogger(__name__)

# Cache of active pipelines by session/room ID
ACTIVE_PIPELINES: Dict[str, PipelineTask] = {}

# Store full multimodal transcripts to pass back to GECX un-summarized
SESSION_TRANSCRIPTS: Dict[str, list[str]] = {}

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
            elif isinstance(frame, LLMFullResponseStartFrame):
                # Reset buffer at start of each new response to prevent
                # collapsing multiple turns into a single chat message.
                self._text_buffer = ""
            elif isinstance(frame, LLMFullResponseEndFrame):
                if self._text_buffer.strip():
                    buffer_text = self._text_buffer.strip()
                    logger.info(f"Intercepted LLM block: {buffer_text}")
                    
                    if self.room_name not in SESSION_TRANSCRIPTS:
                        SESSION_TRANSCRIPTS[self.room_name] = []
                    
                    if buffer_text:
                        SESSION_TRANSCRIPTS[self.room_name].append(f"Visual Agent: {buffer_text}")
                        await self.connection_manager.send_to_room_agent_message(self.room_name, buffer_text)
                    
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
                
                if self.room_name not in SESSION_TRANSCRIPTS:
                    SESSION_TRANSCRIPTS[self.room_name] = []
                SESSION_TRANSCRIPTS[self.room_name].append(f"User: {frame.text.strip()}")
                
                await self.connection_manager.send_to_room_user_transcription(
                    self.room_name, frame.text.strip()
                )
                
        await self.push_frame(frame, direction)


async def create_and_run_pipeline(room_name: str, connection_manager: Any, reason: str = None, pipeline_type: str = "concierge"):
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
    prompt_filename = "sentiment_system.xml" if pipeline_type == "sentiment" else "pipecat_system.xml"
    prompt_path = pathlib.Path(__file__).parent / "prompts" / prompt_filename
    if prompt_path.exists():
        system_instruction = prompt_path.read_text()
    else:
        logger.warning(f"Pipecat {prompt_filename} not found!")
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

    end_session_tool = [{"function_declarations": [{
        "name": "end_vision_session",
        "description": "End the current live video session. You MUST call this explicitly when the user says goodbye or the conversation reaches a natural conclusion.",
        "parameters": {
            "type": "object",
            "properties": {
                "summary": {
                    "type": "string",
                    "description": "Brief description of what was discussed."
                }
            },
            "required": ["summary"]
        }
    }]}]

    llm = GeminiLiveLLMService(
        api_key=settings.GEMINI_API_KEY,
        system_instruction=system_instruction,
        tools=end_session_tool,
    )
    logger.info(
        f">>> LLM created: vad_disabled={llm._vad_disabled}, "
        f"ready_for_realtime_input={llm._ready_for_realtime_input}, "
        f"inference_on_context_initialization={llm._inference_on_context_initialization}"
    )

    async def handle_end_vision_session(params):
        """Pipecat 1.0.0 callback: receives a single FunctionCallParams object."""
        logger.info(f"end_vision_session called with args: {params.arguments}")
        await params.result_callback({"status": "success"})
        
        async def close_pipeline_delayed():
            summary = params.arguments.get("summary", "The multimodal session concluded successfully.")
            
            # Send structured CES event while WebSocket is still alive.
            # Uses event-based input (not text) per architecture guardrail.
            try:
                ces_client = CESClient()
                logger.info(f"Sending vision_session_complete event to GECX for room {room_name}")
                ces_response = await ces_client.send_event(
                    session_id=room_name,
                    event_name="vision_session_complete",
                    variables={"vision_summary": summary},
                )
                logger.info(f"GECX response: text={ces_response.get('text')!r}, end_session={ces_response.get('end_session')}")

                # Forward GECX's response text to the frontend
                if ces_response and ces_response.get("text"):
                    await connection_manager.send_to_room_agent_message(room_name, ces_response["text"])
                else:
                    logger.warning("GECX returned no text for vision_session_complete")

            except Exception as e:
                logger.error(f"Failed to handoff context via CES event: {e}", exc_info=True)
            
            # Close the multimodal UI
            await connection_manager.trigger_multimodal_end(room_name)
            
            # Clear multimodal state from redis so refresh doesn't pop video up again
            from app.services import session_store
            await session_store.update_session(room_name, multimodal_event=None)
            
            await stop_pipeline(room_name)
        asyncio.create_task(close_pipeline_delayed())
    
    llm.register_function("end_vision_session", handle_end_vision_session)

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
        SESSION_TRANSCRIPTS.pop(room_name, None)
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
    """Inject a typed chat message into the active Gemini Live pipeline.
    
    Uses TranscriptionFrame to route text through send_realtime_input,
    which places it in the same realtime stream as audio and video.
    This ensures Gemini considers the current camera feed when responding
    to typed text, preventing hallucinations from text-only inference.
    
    NOTE: Image attachments cannot be injected via the realtime path and
    are logged as a warning. Use the camera feed for visual input.
    
    Returns True if the message was injected, False if no active pipeline.
    """
    task = ACTIVE_PIPELINES.get(room_name)
    if not task:
        return False
    
    if attachments:
        logger.warning(
            f"Image attachments cannot be injected into realtime pipeline for room {room_name}; "
            "only camera feed is supported during live sessions."
        )
    
    if text:
        from pipecat.frames.frames import TranscriptionFrame
        frame = TranscriptionFrame(text=text, user_id=room_name, timestamp="")
        await task.queue_frame(frame)
        logger.info(f"Injected text as realtime input for room {room_name}: {text[:80]}")
    
    return True

