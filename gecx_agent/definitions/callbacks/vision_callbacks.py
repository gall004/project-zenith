"""Server-side callbacks for the vision pipeline.

These run deterministically at specific points in the agent lifecycle
within the CES Python sandbox. They enforce state machine transitions
that prompts alone cannot guarantee.

CES Callback Signatures (from docs):
  before_tool_callback(tool, input, callback_context) -> Optional[dict]
  after_tool_callback(tool, input, callback_context, tool_response) -> Optional[dict]
  before_model_callback(callback_context, llm_request) -> Optional[LlmResponse]

Runtime classes (auto-imported in CES sandbox):
  CallbackContext — session state via .variables dict
  Tool            — .name attribute for matching
  LlmRequest      — .contents list of Content objects
  LlmResponse     — wraps Content for model interception
  Content, Part   — message building blocks
"""

from typing import Any, Optional


def before_tool_callback(
    tool: "Tool",
    input: dict[str, Any],
    callback_context: "CallbackContext",
) -> Optional[dict[str, Any]]:
    """Validate camera state before vision tools execute.

    - Blocks request_additional_frame if vision_active is False
    - Blocks if vision_frame_count >= vision_max_frames
    - Initializes vision state when camera activates via request_visual_context
    """
    tool_name = tool.name

    if tool_name == "request_additional_frame":
        if not callback_context.variables.get("vision_active", False):
            return {"error": "Camera is not active. Cannot request frame."}

        frame_count = callback_context.variables.get("vision_frame_count", 0)
        max_frames = callback_context.variables.get("vision_max_frames", 3)
        if frame_count >= max_frames:
            return {
                "error": (
                    f"Frame limit reached ({frame_count}/{max_frames}). "
                    "Close the camera and summarize what you've seen."
                )
            }

    if tool_name == "request_visual_context":
        callback_context.variables["vision_active"] = True
        callback_context.variables["vision_mode"] = input.get(
            "mode", "single_frame"
        )
        callback_context.variables["vision_frame_count"] = 0

    # Return None to allow the tool to execute normally
    return None


def after_tool_callback(
    tool: "Tool",
    input: dict[str, Any],
    callback_context: "CallbackContext",
    tool_response: dict,
) -> Optional[dict]:
    """Track frame count and state after vision tools execute.

    - Increments vision_frame_count after each frame capture tool
    - Resets vision state when camera is closed
    """
    tool_name = tool.name

    if tool_name in ("request_visual_context", "request_additional_frame"):
        callback_context.variables["vision_frame_count"] = (
            callback_context.variables.get("vision_frame_count", 0) + 1
        )

    if tool_name == "close_visual_context":
        callback_context.variables["vision_active"] = False
        callback_context.variables["vision_mode"] = "idle"

    # Return None to let the original tool_response pass through
    return None


def before_model_callback(
    callback_context: "CallbackContext",
    llm_request: "LlmRequest",
) -> "Optional[LlmResponse]":
    """Normalize vision_session_complete signals before the model sees them.

    Detects both native CES event and legacy text sentinel, then updates
    state variables — eliminating the dual-trigger hack in the XML prompt.
    """
    is_vision_complete = False

    # Check conversation history for the vision_session_complete sentinel
    for content in llm_request.contents:
        for part in content.parts:
            # Check for text-based event sentinel from the frontend
            if (
                hasattr(part, "text")
                and part.text
                and "<event>vision_session_complete</event>" in part.text
            ):
                is_vision_complete = True
                break
        if is_vision_complete:
            break

    if is_vision_complete:
        callback_context.variables["vision_active"] = False
        callback_context.variables["vision_mode"] = "idle"

    # Return None to let the LLM process the request normally
    return None
