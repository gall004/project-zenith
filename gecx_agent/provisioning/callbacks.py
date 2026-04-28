"""CES Callback provisioning.

Reads callback Python source from gecx_agent/definitions/callbacks/
and registers them on the appropriate agent resource via the CES API.

Callbacks are stored on agents as separate top-level fields:
  - ``beforeToolCallbacks``  → list of ``{"pythonCode": "<source>"}``
  - ``afterToolCallbacks``   → list of ``{"pythonCode": "<source>"}``
  - ``beforeModelCallbacks`` → list of ``{"pythonCode": "<source>"}``

Discovered via API probing:
  - updateMask does NOT support these fields
  - Must GET the agent body, merge callbacks, then PATCH the full body
"""

import logging
from pathlib import Path

import httpx

from .api import CES_API_BASE

logger = logging.getLogger(__name__)

CALLBACK_DIR = Path(__file__).resolve().parents[1] / "definitions" / "callbacks"


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


def _extract_function(source: str, func_name: str) -> str:
    """Extract a single top-level function from a Python source file.

    Includes any module-level import statements so the function is
    self-contained when injected into the CES sandbox.

    Args:
        source: Full Python source code.
        func_name: Name of the function to extract.

    Returns:
        The function source code (with imports prepended) as a string.
    """
    lines = source.split("\n")

    # Collect import lines from the module preamble
    import_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("import ") or stripped.startswith("from "):
            import_lines.append(line)

    # Locate the target function
    start = None
    end = None

    for i, line in enumerate(lines):
        if line.startswith(f"def {func_name}("):
            start = i
        elif start is not None and (
            line.startswith("def ") or line.startswith("class ")
        ):
            # Hit next top-level definition
            end = i
            break

    if start is None:
        raise ValueError(f"Function {func_name} not found in source")

    if end is None:
        end = len(lines)

    # Strip trailing blank lines
    while end > start and not lines[end - 1].strip():
        end -= 1

    func_body = "\n".join(lines[start:end])

    # Prepend imports if any exist
    if import_lines:
        return "\n".join(import_lines) + "\n\n\n" + func_body
    return func_body


def register_vision_callbacks(agent_name: str, headers: dict) -> None:
    """Register before_tool, after_tool, and before_model callbacks
    on the vision agent.

    Strategy: GET the current agent body, add/replace the callback
    fields, then PATCH the full body back. This preserves instruction,
    tools, and other fields that would be wiped by a partial PATCH.

    Args:
        agent_name: Full CES resource name of the vision agent.
        headers: Authenticated request headers.
    """
    source = _read_callback_source("vision_callbacks.py")

    # Extract individual callback functions
    before_tool_src = _extract_function(source, "before_tool_callback")
    after_tool_src = _extract_function(source, "after_tool_callback")
    before_model_src = _extract_function(source, "before_model_callback")

    # GET current agent to preserve existing fields
    url = f"{CES_API_BASE}/{agent_name}"
    try:
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        agent_body = resp.json()
    except httpx.HTTPError as e:
        logger.warning("Failed to fetch agent for callback registration: %s", e)
        return

    # Remove read-only fields
    for key in ("name", "createTime", "updateTime", "etag"):
        agent_body.pop(key, None)

    # Set the callback fields
    agent_body["beforeToolCallbacks"] = [{"pythonCode": before_tool_src}]
    agent_body["afterToolCallbacks"] = [{"pythonCode": after_tool_src}]
    agent_body["beforeModelCallbacks"] = [{"pythonCode": before_model_src}]

    try:
        resp = httpx.patch(url, headers=headers, json=agent_body, timeout=30)
        resp.raise_for_status()

        # Verify callbacks were accepted
        result = resp.json()
        registered = []
        for field in ("beforeToolCallbacks", "afterToolCallbacks",
                      "beforeModelCallbacks"):
            if field in result:
                registered.append(field)

        logger.info(
            "Registered vision callbacks on agent %s: %s",
            agent_name,
            ", ".join(registered) if registered else "(none confirmed)",
        )
    except httpx.HTTPError as e:
        logger.warning(
            "Failed to register vision callbacks (non-fatal): %s. "
            "Callbacks may need to be added manually in CX Agent Studio.",
            e,
        )
