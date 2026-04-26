"""CES App Variable provisioning.

Manages the variableDeclarations array on the CES App resource.
Variables are the state bridge between the frontend widget,
agent prompts (static {{}} / dynamic {}), tools, and callbacks.
"""

import logging

import httpx

from .api import CES_API_BASE

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# All app-level variable declarations — single source of truth.
#
# Template syntax reference:
#   {{var}}  → Static: text-substituted into the prompt before the model call.
#   {var}   → Dynamic: appended as <state_update> events in conversation history.
# ---------------------------------------------------------------------------
VARIABLE_DECLARATIONS = [
    {
        "name": "system_webhook_token",
        "description": (
            "Cryptographically secure token for webhook routing. "
            "Injected via sessionParameters on each RunSession call."
        ),
        "schema": {"type": "STRING"},
    },
    {
        "name": "vision_active",
        "description": "Whether the camera feed is currently active.",
        "schema": {"type": "BOOLEAN"},
    },
    {
        "name": "vision_mode",
        "description": (
            "Current vision capture mode: idle, single_frame, or continuous."
        ),
        "schema": {"type": "STRING"},
    },
    {
        "name": "vision_frame_count",
        "description": "Number of frames sent in the current vision session.",
        "schema": {"type": "NUMBER"},
    },
    {
        "name": "vision_max_frames",
        "description": "Maximum frames allowed per vision session.",
        "schema": {"type": "NUMBER"},
    },
    {
        "name": "vision_summary",
        "description": "Agent's analysis summary from the vision session.",
        "schema": {"type": "STRING"},
    },
    {
        "name": "customer_name",
        "description": "Customer's display name for personalization.",
        "schema": {"type": "STRING"},
    },
]


def register_app_variables(app_name: str, headers: dict) -> None:
    """Register all session variables on the CES app.

    CX Agent Studio requires variables to be explicitly declared at the
    app level before ``{variable_name}`` references in agent prompts
    are resolved at runtime.

    Uses PATCH with updateMask=variableDeclarations.
    Requires displayName in the body (CES API constraint).

    Args:
        app_name: Full resource name of the CES app.
        headers: Authenticated request headers.
    """
    url = f"{CES_API_BASE}/{app_name}"

    # CES PATCH requires displayName alongside variableDeclarations
    try:
        get_resp = httpx.get(url, headers=headers, timeout=30)
        get_resp.raise_for_status()
        display_name = get_resp.json().get("displayName", "")
    except httpx.HTTPError:
        logger.warning(
            "Could not fetch app displayName for variable registration"
        )
        return

    body = {
        "displayName": display_name,
        "variableDeclarations": VARIABLE_DECLARATIONS,
    }
    try:
        url_with_mask = f"{url}?updateMask=variableDeclarations"
        resp = httpx.patch(
            url_with_mask, headers=headers, json=body, timeout=30
        )
        resp.raise_for_status()
        names = [v["name"] for v in VARIABLE_DECLARATIONS]
        logger.info("Registered app variables: %s", ", ".join(names))
    except httpx.HTTPError as e:
        logger.warning("Failed to register app variables (non-fatal): %s", e)
