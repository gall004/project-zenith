"""Programmatic provisioning of the GECX Orchestrator on CX Agent Studio.

Thin orchestrator that imports focused modules from the provisioning package.

Uses the CX Agent Studio REST API (ces.googleapis.com) to:
1. Create an app + root agent with system instruction
2. Register session variables for the vision pipeline
3. Idempotent and update-aware — syncs config on every run
4. Export GECX_AGENT_ID and CES_APP_ID to .env

Note: Tools (request_visual_context, close_visual_context, etc.) are
client-side functions registered on the <chat-messenger> widget at runtime.
No server-side toolset provisioning is needed.

Uses Application Default Credentials (ADC) — zero hardcoded keys.
Uses httpx per Project Zenith governance (not requests).
"""

import argparse
import logging
import os
import sys
from pathlib import Path

from provisioning.auth import get_auth_headers
from provisioning.app import find_existing_app, create_app, set_root_agent
from provisioning.agent import provision_agent, resolve_tool_names
from provisioning.variables import register_app_variables
from provisioning.callbacks import register_vision_callbacks
from provisioning.env import export_to_env

logger = logging.getLogger(__name__)

# Paths relative to project root
_SYSTEM_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_system.xml"
_SENTIMENT_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_sentiment_agent.xml"
_VISION_INSTRUCTION_PATH = "gecx_agent/definitions/prompts/gecx_vision_agent.xml"


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


def provision_gecx_agent(
    project_id: str,
    region: str,
    project_root: Path,
    app_display_name: str,
    agent_display_name: str,
) -> tuple[str, str]:
    """Create or update the GECX Orchestrator on CX Agent Studio.

    Uses ces.googleapis.com REST API with app → agent hierarchy.
    Idempotent: matches by display name and updates if exists.

    Note: Tools are client-side functions registered on the <chat-messenger>
    widget. No server-side toolset provisioning is performed here.

    Args:
        project_id: GCP project ID.
        region: GCP region.
        project_root: Absolute path to the project root.
        app_display_name: Display name for the CES app.
        agent_display_name: Display name for the root agent.

    Returns:
        A tuple of (agent_id, app_id).
    """
    root_instruction = _read_instruction(project_root, _SYSTEM_INSTRUCTION_PATH)
    sentiment_instruction = _read_instruction(
        project_root, _SENTIMENT_INSTRUCTION_PATH
    )
    vision_instruction = _read_instruction(
        project_root, _VISION_INSTRUCTION_PATH
    )
    headers = get_auth_headers()

    # --- Create or find app ---
    app = find_existing_app(project_id, region, app_display_name, headers)
    if app:
        app_name = app["name"]
        logger.info("CES app already exists: %s", app_name)
    else:
        app = create_app(project_id, region, app_display_name, headers)
        app_name = app["name"]

    # --- Register session variables on the app ---
    register_app_variables(app_name, headers)

    # --- Provision Sentiment Sub-Agent ---
    sentiment_agent_name = provision_agent(
        app_name=app_name,
        display_name="zenith-gecx-sentiment-agent",
        instruction=sentiment_instruction,
        description="Handles emotionally intelligent sentiment demo interactions.",
        headers=headers,
    )

    # --- Provision Vision Sub-Agent ---
    vision_tool_names = resolve_tool_names(
        app_name,
        ["request_visual_context", "request_additional_frame", "close_visual_context"],
        headers,
    )
    vision_agent_name = provision_agent(
        app_name=app_name,
        display_name="zenith-gecx-vision-agent",
        instruction=vision_instruction,
        description="Handles standard visual context / object analysis interactions.",
        headers=headers,
        extra_tools=vision_tool_names,
    )

    # --- Register vision callbacks (deterministic control plane) ---
    register_vision_callbacks(vision_agent_name, headers)

    # --- Provision Root Agent ---
    root_agent_name = provision_agent(
        app_name=app_name,
        display_name=agent_display_name,
        instruction=root_instruction,
        description="Customer-facing GECX root router. Triages and delegates to child agents.",
        headers=headers,
        toolsets=None,
        child_agents=[sentiment_agent_name, vision_agent_name],
    )

    # Set the root agent for the app
    set_root_agent(app_name, root_agent_name, headers)

    app_id = app_name.split("/apps/")[-1]
    root_agent_id = root_agent_name.split("/agents/")[-1]
    return root_agent_id, app_id


def main() -> int:
    """Bootstrap the GECX Frontend Orchestrator on CX Agent Studio.

    Reads GCP_PROJECT_ID, GCP_REGION from environment.
    No webhook URL is required — tools are client-side functions.

    Returns:
        Exit code: 0 for success, 1 for failure.
    """
    parser = argparse.ArgumentParser(
        description="Bootstrap GECX Orchestrator on CX Agent Studio"
    )
    parser.add_argument(
        "--app-name",
        default=os.environ.get("GECX_APP_NAME", "zenith-gecx-orchestrator"),
        help="Display name for the GECX App",
    )
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Path to the env file to write CES_APP_ID and GECX_AGENT_ID",
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

    project_root = Path(__file__).resolve().parent.parent

    logger.info("=== Provisioning GECX on CX Agent Studio ===")
    logger.info("CES Region: %s", ces_region)
    try:
        agent_id, app_id = provision_gecx_agent(
            project_id, ces_region, project_root,
            app_display_name=args.app_name,
            agent_display_name=f"{args.app_name}-root-agent"
        )
    except Exception as e:
        logger.error("GECX agent provisioning failed: %s", e)
        return 1

    export_to_env(agent_id, app_id, project_root, args.env_file)
    logger.info("CES_APP_ID=%s", app_id)
    logger.info("GECX_AGENT_ID=%s", agent_id)
    logger.info("=== GECX Bootstrap Complete ===")

    return 0


if __name__ == "__main__":
    sys.exit(main())
