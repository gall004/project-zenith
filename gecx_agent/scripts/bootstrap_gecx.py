"""Programmatic provisioning of the GECX Orchestrator on CX Agent Studio.

Uses the CX Agent Studio REST API (ces.googleapis.com) to:
1. Create an app + root agent with system instruction
2. Attach the request_visual_context OpenAPI tool (webhook URL injected)
3. Idempotent and update-aware — syncs config on every run
4. Export GECX_AGENT_ID to .env

Uses Application Default Credentials (ADC) — zero hardcoded keys.
Uses httpx per Project Zenith governance (not requests).
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from pathlib import Path

import google.auth
import google.auth.transport.requests
import httpx
import yaml

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_APP_DISPLAY_NAME = "zenith-gecx-orchestrator"
_AGENT_DISPLAY_NAME = "zenith-gecx-root-agent"
_CES_API_BASE = "https://ces.googleapis.com/v1beta"

# Paths relative to project root
_SYSTEM_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_system.xml"
_SENTIMENT_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_sentiment_agent.xml"
_VISION_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_vision_agent.xml"
_TOOL_SCHEMA_PATH = "gecx_agent/definitions/tools/request_visual_context.yaml"
_ENV_FILE_PATH = ".env"


# ===================================================================
# Authentication
# ===================================================================


def _get_auth_headers() -> dict:
    """Get authenticated headers using Application Default Credentials.

    Returns:
        Headers dict with Authorization bearer token.
    """
    credentials, _ = google.auth.default(
        scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    auth_req = google.auth.transport.requests.Request()
    credentials.refresh(auth_req)
    return {
        "Authorization": f"Bearer {credentials.token}",
        "Content-Type": "application/json",
    }


# ===================================================================
# File Readers
# ===================================================================


def _read_instruction(project_root: Path, rel_path: str) -> str:
    """Read a GECX agent's system instruction from a file.

    Args:
        project_root: Absolute path to the project root.
        rel_path: Relative path to the XML file.

    Returns:
        The system instruction text.

    Raises:
        FileNotFoundError: If the system instruction file is missing.
    """
    path = project_root / rel_path
    if not path.exists():
        raise FileNotFoundError(f"System instruction not found: {path}")
    text = path.read_text(encoding="utf-8")
    logger.info(
        "Read GECX system instruction: %d chars from %s", len(text), path.name
    )
    return text


def _read_tool_schema(project_root: Path, webhook_url: str) -> dict:
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
    path = project_root / _TOOL_SCHEMA_PATH
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


# ===================================================================
# CES API Helpers
# ===================================================================


def _ces_url(project_id: str, region: str, path: str = "") -> str:
    """Build a CES API URL.

    Args:
        project_id: GCP project ID.
        region: GCP region.
        path: Additional path segments (e.g., /apps/xxx/agents).

    Returns:
        Fully qualified CES REST endpoint URL.
    """
    base = f"{_CES_API_BASE}/projects/{project_id}/locations/{region}"
    return f"{base}{path}"


def _find_existing_app(
    project_id: str, region: str, display_name: str, headers: dict
) -> dict | None:
    """Check if a CES app with the display name already exists.

    Args:
        project_id: GCP project ID.
        region: GCP region.
        display_name: Display name to match.
        headers: Authenticated request headers.

    Returns:
        The existing app resource dict, or None.
    """
    url = _ces_url(project_id, region, "/apps")
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for app in resp.json().get("apps", []):
        if app.get("displayName") == display_name:
            logger.info("Found existing CES app: %s", app.get("name"))
            return app
    return None


def _find_existing_agent(
    app_name: str, display_name: str, headers: dict
) -> dict | None:
    """Check if an agent within an app already exists.

    Args:
        app_name: Full resource name of the CES app.
        display_name: Agent display name to match.
        headers: Authenticated request headers.

    Returns:
        The existing agent resource dict, or None.
    """
    url = f"{_CES_API_BASE}/{app_name}/agents"
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for agent in resp.json().get("agents", []):
        if agent.get("displayName") == display_name:
            logger.info("Found existing CES agent: %s", agent.get("name"))
            return agent
    return None


def _find_existing_toolset(
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
    url = f"{_CES_API_BASE}/{app_name}/toolsets"
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for ts in resp.json().get("toolsets", []):
        if ts.get("displayName") == display_name:
            logger.info("Found existing toolset: %s", ts.get("name"))
            return ts
    return None


def _provision_toolset(
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

    existing = _find_existing_toolset(app_name, display_name, headers)
    if existing:
        ts_name = existing["name"]
        logger.info("Toolset already exists — updating: %s", ts_name)
        url = f"{_CES_API_BASE}/{ts_name}"
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
        resp.raise_for_status()
        logger.info("Updated toolset: %s", ts_name)
        return ts_name

    # Create new toolset
    logger.info("Creating CES toolset: %s", display_name)
    url = f"{_CES_API_BASE}/{app_name}/toolsets"
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


def _poll_lro(
    operation_name: str, headers: dict, timeout_sec: int = 120
) -> dict:
    """Poll a CES long-running operation until completion.

    Args:
        operation_name: Full operation resource name.
        headers: Authenticated request headers.
        timeout_sec: Maximum seconds to wait before giving up.

    Returns:
        The completed operation response dict.

    Raises:
        TimeoutError: If the operation doesn't complete in time.
        RuntimeError: If the operation finishes with an error.
    """
    url = f"{_CES_API_BASE}/{operation_name}"
    deadline = time.time() + timeout_sec
    poll_interval = 5

    while time.time() < deadline:
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        op = resp.json()

        if op.get("done"):
            if "error" in op:
                raise RuntimeError(
                    f"CES operation failed: {op['error']}"
                )
            return op.get("response", {})

        logger.info(
            "Waiting for CES operation to complete... (%.0fs remaining)",
            deadline - time.time(),
        )
        time.sleep(poll_interval)

    raise TimeoutError(
        f"CES operation {operation_name} did not complete within "
        f"{timeout_sec}s"
    )


def _resolve_lro_response(resp_json: dict, headers: dict) -> dict:
    """If a CES response is an LRO, poll it; otherwise return as-is.

    Args:
        resp_json: The raw JSON response from a CES create call.
        headers: Authenticated request headers.

    Returns:
        The resolved resource dictionary.
    """
    if "done" in resp_json:
        if resp_json.get("done"):
            return resp_json.get("response", resp_json)
        return _poll_lro(resp_json["name"], headers)
    return resp_json


# ===================================================================
# Agent Provisioning
# ===================================================================


def _set_root_agent(
    app_name: str, agent_name: str, headers: dict
) -> None:
    """Set the root agent on a CES app.

    CES apps require an explicit rootAgent designation via PATCH.
    Without this, the app reports 'does not have a root agent'.

    Args:
        app_name: Full resource name of the CES app.
        agent_name: Full resource name of the agent to set as root.
        headers: Authenticated request headers.
    """
    url = f"{_CES_API_BASE}/{app_name}"
    body: dict = {
        "rootAgent": agent_name,
    }
    try:
        resp = httpx.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        current_app = resp.json()
        body["displayName"] = current_app.get("displayName", "")
    except httpx.HTTPError:
        logger.warning("Could not fetch app displayName for root agent set")
        return

    try:
        resp = httpx.patch(url, headers=headers, json=body, timeout=60)
        resp.raise_for_status()
        logger.info(
            "Set root agent on app %s → %s",
            current_app.get("displayName"),
            agent_name.split("/agents/")[-1],
        )
    except httpx.HTTPError as e:
        logger.warning("Failed to set root agent (non-fatal): %s", e)


def _provision_agent(
    app_name: str,
    display_name: str,
    instruction: str,
    description: str,
    headers: dict,
    toolsets: list[dict] = None,
    child_agents: list[str] = None,
) -> str:
    """Create or update a CES agent within an app.
    
    Returns the full agent resource name.
    """
    existing = _find_existing_agent(app_name, display_name, headers)
    
    body = {
        "displayName": display_name,
        "instruction": instruction,
        "description": description,
    }
    if toolsets:
        body["toolsets"] = toolsets
    if child_agents:
        body["childAgents"] = child_agents

    if existing:
        agent_name = existing["name"]
        logger.info("CES agent already exists — syncing: %s", display_name)
        url = f"{_CES_API_BASE}/{agent_name}"
        try:
            resp = httpx.patch(url, headers=headers, json=body, timeout=60)
            resp.raise_for_status()
            logger.info("Updated CES agent config for %s", display_name)
        except httpx.HTTPError as e:
            logger.warning("Agent update failed (non-fatal) for %s: %s", display_name, e)
        return agent_name

    logger.info("Creating CES agent: %s", display_name)
    url = f"{_CES_API_BASE}/{app_name}/agents"
    resp = httpx.post(url, headers=headers, json=body, timeout=60)
    resp.raise_for_status()
    raw = resp.json()
    logger.info("CES agent create response for %s: %s", display_name, raw.get("name", "?"))
    agent = _resolve_lro_response(raw, headers)
    agent_name = agent["name"]
    logger.info("CES agent created: %s", agent_name)
    return agent_name


def provision_gecx_agent(
    project_id: str,
    region: str,
    project_root: Path,
    webhook_url: str,
) -> tuple[str, str]:
    """Create or update the GECX Orchestrator on CX Agent Studio.

    Uses ces.googleapis.com REST API with app → agent hierarchy.
    Idempotent: matches by display name and updates if exists.

    Args:
        project_id: GCP project ID.
        region: GCP region.
        project_root: Absolute path to the project root.
        webhook_url: The deployed FastAPI backend URL.

    Returns:
        A tuple of (agent_id, app_id).
    """
    root_instruction = _read_instruction(project_root, _SYSTEM_INSTRUCTION_PATH)
    sentiment_instruction = _read_instruction(project_root, _SENTIMENT_INSTRUCTION_PATH)
    vision_instruction = _read_instruction(project_root, _VISION_INSTRUCTION_PATH)
    tool_schema = _read_tool_schema(project_root, webhook_url)
    headers = _get_auth_headers()

    # --- Create or find app ---
    app = _find_existing_app(project_id, region, _APP_DISPLAY_NAME, headers)
    if app:
        app_name = app["name"]
        logger.info("CES app already exists: %s", app_name)
    else:
        logger.info("Creating CES app: %s", _APP_DISPLAY_NAME)
        url = _ces_url(project_id, region, "/apps")
        body = {
            "displayName": _APP_DISPLAY_NAME,
        }
        resp = httpx.post(url, headers=headers, json=body, timeout=60)
        resp.raise_for_status()
        raw = resp.json()
        logger.info("CES app create response: %s", raw.get("name", "?"))
        app = _resolve_lro_response(raw, headers)
        app_name = app["name"]
        logger.info("CES app created: %s", app_name)

    # --- Provision toolset ---
    toolset_name = _provision_toolset(app_name, tool_schema, headers)
    toolsets_payload = [{"toolset": toolset_name, "toolIds": ["request_visual_context"]}]

    # --- Provision Sentiment Sub-Agent ---
    sentiment_agent_name = _provision_agent(
        app_name=app_name,
        display_name="zenith-gecx-sentiment-agent",
        instruction=sentiment_instruction,
        description="Handles emotionally intelligent sentiment demo interactions.",
        headers=headers,
        toolsets=toolsets_payload,
    )

    # --- Provision Vision Sub-Agent ---
    vision_agent_name = _provision_agent(
        app_name=app_name,
        display_name="zenith-gecx-vision-agent",
        instruction=vision_instruction,
        description="Handles standard visual context / object analysis interactions.",
        headers=headers,
        toolsets=toolsets_payload,
    )

    # --- Provision Root Agent ---
    root_agent_name = _provision_agent(
        app_name=app_name,
        display_name=_AGENT_DISPLAY_NAME,
        instruction=root_instruction,
        description="Customer-facing GECX root router. Triages and delegates to child agents.",
        headers=headers,
        toolsets=None, # Root agent no longer has tools
        child_agents=[sentiment_agent_name, vision_agent_name],
    )

    # Set the root agent for the app
    _set_root_agent(app_name, root_agent_name, headers)
    
    app_id = app_name.split("/apps/")[-1]
    root_agent_id = root_agent_name.split("/agents/")[-1]
    return root_agent_id, app_id


# ===================================================================
# .env Export
# ===================================================================


def _upsert_env_var(lines: list[str], key: str, value: str) -> list[str]:
    """Insert or update an env var in a list of .env lines."""
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            return lines
    lines.append(f"{key}={value}")
    return lines


def export_to_env(
    agent_id: str, app_id: str, project_root: Path
) -> None:
    """Write CES_APP_ID and GECX_AGENT_ID to the local .env file.

    CES_APP_ID is required for the RunSession API session path.
    GECX_AGENT_ID is retained for reference and future use.

    Idempotent: updates values if they already exist, appends if not.

    Args:
        agent_id: The GECX Agent resource ID.
        app_id: The CES App resource ID (used in RunSession path).
        project_root: Absolute path to the project root.
    """
    env_path = project_root / _ENV_FILE_PATH
    lines: list[str] = []

    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    lines = _upsert_env_var(lines, "CES_APP_ID", app_id)
    lines = _upsert_env_var(lines, "GECX_AGENT_ID", agent_id)

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    logger.info("Exported CES_APP_ID=%s to %s", app_id, env_path)
    logger.info("Exported GECX_AGENT_ID=%s to %s", agent_id, env_path)


# ===================================================================
# Main Entrypoint
# ===================================================================


def main() -> int:
    """Bootstrap the GECX Frontend Orchestrator on CX Agent Studio.

    Reads GCP_PROJECT_ID, GCP_REGION from environment and accepts
    the webhook URL via --webhook-url argument or FASTAPI_BACKEND_URL env var.

    Returns:
        Exit code: 0 for success, 1 for failure.
    """
    parser = argparse.ArgumentParser(
        description="Bootstrap GECX Orchestrator on CX Agent Studio"
    )
    parser.add_argument(
        "--webhook-url",
        default=os.environ.get("FASTAPI_BACKEND_URL", ""),
        help="Deployed FastAPI backend webhook URL",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )

    project_id = os.environ.get("GCP_PROJECT_ID")
    gcp_region = os.environ.get("GCP_REGION", "us-central1")

    # CES API uses macro-regions (e.g., "us") not micro-regions
    ces_region = os.environ.get(
        "CES_REGION", gcp_region.split("-")[0]
    )

    if not project_id:
        logger.error("GCP_PROJECT_ID environment variable is required")
        return 1

    webhook_url = args.webhook_url
    if not webhook_url:
        logger.error(
            "Webhook URL required: pass --webhook-url or set FASTAPI_BACKEND_URL"
        )
        return 1

    project_root = Path(__file__).resolve().parent.parent.parent

    logger.info("=== Provisioning GECX on CX Agent Studio ===")
    logger.info("Webhook URL: %s", webhook_url)
    logger.info("CES Region: %s", ces_region)
    try:
        agent_id, app_id = provision_gecx_agent(
            project_id, ces_region, project_root, webhook_url
        )
    except Exception as e:
        logger.error("GECX agent provisioning failed: %s", e)
        return 1

    export_to_env(agent_id, app_id, project_root)
    logger.info("CES_APP_ID=%s", app_id)
    logger.info("GECX_AGENT_ID=%s", agent_id)
    logger.info("=== GECX Bootstrap Complete ===")

    return 0


if __name__ == "__main__":
    sys.exit(main())
