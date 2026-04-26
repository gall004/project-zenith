"""CES Toolset management.

Handles finding, creating, and updating OpenAPI toolsets on the CES App.
"""

import json
import logging
import os
import re

import httpx
import yaml

from .api import CES_API_BASE

logger = logging.getLogger(__name__)


def read_tool_schema(project_root, webhook_url: str) -> dict:
    """Read the OpenAPI tool schema and inject the webhook URL.

    Replaces the ${FASTAPI_BACKEND_URL} placeholder in the YAML with the
    actual deployed backend URL.

    Args:
        project_root: Absolute path to the project root.
        webhook_url: The deployed FastAPI backend webhook URL.

    Returns:
        The parsed YAML as a dictionary with URL injected.

    Raises:
        FileNotFoundError: If the tool schema file is missing.
    """
    path = project_root / "gecx_agent/definitions/tools/request_visual_context.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Tool schema not found: {path}")
    raw_yaml = path.read_text(encoding="utf-8")

    def _resolve_env_var(match: re.Match) -> str:
        var_name = match.group(1)
        if var_name == "FASTAPI_BACKEND_URL":
            return webhook_url
        return os.environ.get(var_name, match.group(0))

    resolved_yaml = re.sub(r"\$\{(\w+)}", _resolve_env_var, raw_yaml)
    schema = yaml.safe_load(resolved_yaml)
    logger.info(
        "Read GECX tool schema: %s (webhook: %s)", path.name, webhook_url
    )
    return schema


def find_existing_toolset(
    app_name: str, display_name: str, headers: dict
) -> dict | None:
    """Check if a toolset with the display name already exists.

    Args:
        app_name: Full resource name of the CES app.
        display_name: Toolset display name to match.
        headers: Authenticated request headers.

    Returns:
        The existing toolset resource dict, or None.
    """
    url = f"{CES_API_BASE}/{app_name}/toolsets"
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for ts in resp.json().get("toolsets", []):
        if ts.get("displayName") == display_name:
            logger.info("Found existing toolset: %s", ts.get("name"))
            return ts
    return None


def provision_toolset(
    app_name: str,
    tool_schema: dict,
    headers: dict,
) -> str:
    """Create or update the OpenAPI toolset on the CES app.

    Args:
        app_name: Full resource name of the CES app.
        tool_schema: Parsed OpenAPI schema dict (from YAML).
        headers: Authenticated request headers.

    Returns:
        The toolset resource name.
    """
    display_name = "request_visual_context"
    schema_json = json.dumps(tool_schema)

    existing = find_existing_toolset(app_name, display_name, headers)
    if existing:
        ts_name = existing["name"]
        logger.info("Toolset already exists — updating: %s", ts_name)
        url = f"{CES_API_BASE}/{ts_name}"
        body = {
            "displayName": display_name,
            "description": (
                "Signals the frontend to enable the user's camera track "
                "for multimodal visual context during a LiveKit voice session."
            ),
            "openApiToolset": {
                "openApiSchema": schema_json,
            },
        }
        resp = httpx.patch(url, headers=headers, json=body, timeout=60)
        try:
            resp.raise_for_status()
        except httpx.HTTPError as e:
            logger.error("Toolset update failed with 400: %s", resp.text)
            raise e
        return ts_name

    # Create new toolset
    logger.info("Creating CES toolset: %s", display_name)
    url = f"{CES_API_BASE}/{app_name}/toolsets"
    body = {
        "displayName": display_name,
        "description": (
            "Signals the frontend to enable the user's camera track "
            "for multimodal visual context during a LiveKit voice session."
        ),
        "openApiToolset": {
            "openApiSchema": schema_json,
        },
    }
    resp = httpx.post(url, headers=headers, json=body, timeout=60)
    resp.raise_for_status()
    ts = resp.json()
    ts_name = ts["name"]
    logger.info("CES toolset created: %s", ts_name)
    return ts_name
