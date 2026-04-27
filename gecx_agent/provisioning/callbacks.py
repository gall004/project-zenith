"""CES Callback provisioning.

Reads callback Python source from gecx_agent/definitions/callbacks/
and registers them on the appropriate agent resource via the CES API.

Callbacks are attached to agents via PATCH on the agent resource,
using the `callbacks` field in the agent body. Each callback entry
specifies a type and the Python source code that runs in the CES sandbox.
"""

import logging
from pathlib import Path

import httpx

from .api import CES_API_BASE

logger = logging.getLogger(__name__)

CALLBACK_DIR = Path(__file__).resolve().parents[1] / "definitions" / "callbacks"

# CES callback type identifiers used in the agent resource body
BEFORE_TOOL = "BEFORE_TOOL"
AFTER_TOOL = "AFTER_TOOL"
BEFORE_MODEL = "BEFORE_MODEL"


def _read_callback_source(filename: str) -> str:
    """Read the full Python source of a callback file.

    Args:
        filename: Name of the callback file (e.g., 'vision_callbacks.py').

    Returns:
        The complete Python source code as a string.

    Raises:
        FileNotFoundError: If the callback source file is missing.
    """
    path = CALLBACK_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Callback source not found: {path}")
    source = path.read_text(encoding="utf-8")
    logger.info("Read callback source: %d chars from %s", len(source), path.name)
    return source


def register_vision_callbacks(agent_name: str, headers: dict) -> None:
    """Register before_tool, after_tool, and before_model callbacks
    on the vision agent.

    Reads the Python source from vision_callbacks.py and attaches
    all three callback types to the agent via PATCH.

    Args:
        agent_name: Full CES resource name of the vision agent.
        headers: Authenticated request headers.
    """
    source = _read_callback_source("vision_callbacks.py")

    # Build the callbacks array for the agent PATCH body.
    # Each callback specifies its type and the Python source.
    callbacks = [
        {
            "name": "vision_before_tool",
            "config": {
                "callbackType": BEFORE_TOOL,
                "pythonCode": {"code": source},
            },
        },
        {
            "name": "vision_after_tool",
            "config": {
                "callbackType": AFTER_TOOL,
                "pythonCode": {"code": source},
            },
        },
        {
            "name": "vision_before_model",
            "config": {
                "callbackType": BEFORE_MODEL,
                "pythonCode": {"code": source},
            },
        },
    ]

    url = f"{CES_API_BASE}/{agent_name}?updateMask=callbacks"
    body = {"callbacks": callbacks}

    try:
        resp = httpx.patch(url, headers=headers, json=body, timeout=30)
        resp.raise_for_status()
        logger.info(
            "Registered %d vision callbacks on agent %s",
            len(callbacks),
            agent_name,
        )
    except httpx.HTTPError as e:
        logger.warning(
            "Failed to register vision callbacks (non-fatal): %s. "
            "Callbacks may need to be added manually in CX Agent Studio.",
            e,
        )
