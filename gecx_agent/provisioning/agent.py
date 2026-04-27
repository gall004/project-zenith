"""CES Agent lifecycle management.

Handles finding, creating, and updating CES Agent resources within an App.
"""

import logging

import httpx

from .api import CES_API_BASE, resolve_lro_response

logger = logging.getLogger(__name__)


def find_existing_agent(
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
    url = f"{CES_API_BASE}/{app_name}/agents"
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for agent in resp.json().get("agents", []):
        if agent.get("displayName") == display_name:
            logger.info("Found existing CES agent: %s", agent.get("name"))
            return agent
    return None


def resolve_tool_names(
    app_name: str, display_names: list[str], headers: dict
) -> list[str]:
    """Resolve tool display names to full CES resource names.

    CES tools use UUID-based resource names, so we look them up by
    display name from the app's tool list.

    Args:
        app_name: Full resource name of the CES app.
        display_names: List of tool display names to resolve.
        headers: Authenticated request headers.

    Returns:
        List of full resource names for the matched tools.
    """
    url = f"{CES_API_BASE}/{app_name}/tools"
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    tool_map = {
        t["displayName"]: t["name"]
        for t in resp.json().get("tools", [])
    }

    resolved = []
    for dn in display_names:
        if dn in tool_map:
            resolved.append(tool_map[dn])
            logger.info("Resolved tool '%s' → %s", dn, tool_map[dn])
        else:
            logger.warning("Tool '%s' not found in app — skipping", dn)

    return resolved


def provision_agent(
    app_name: str,
    display_name: str,
    instruction: str,
    description: str,
    headers: dict,
    toolsets: list[dict] = None,
    child_agents: list[str] = None,
    model: str = "gemini-3.1-flash-live",
    extra_tools: list[str] = None,
) -> str:
    """Create or update a CES agent within an app.

    Returns the full agent resource name.
    """
    existing = find_existing_agent(app_name, display_name, headers)

    tools = [f"{app_name}/tools/end_session"]
    if extra_tools:
        tools.extend(extra_tools)

    body = {
        "displayName": display_name,
        "instruction": instruction,
        "description": description,
        "tools": tools,
        "modelSettings": {"model": model},
    }
    if toolsets:
        body["toolsets"] = toolsets
    if child_agents:
        body["childAgents"] = child_agents

    if existing:
        agent_name = existing["name"]
        logger.info("CES agent already exists — syncing: %s", display_name)

        # Merge existing toolsets so we don't strip manually attached system tools
        if "toolsets" in existing and toolsets:
            existing_toolsets = existing.get("toolsets", [])
            merged_toolsets_dict = {}
            for t in existing_toolsets:
                merged_toolsets_dict[t["toolset"]] = set(t.get("toolIds", []))
            for t in toolsets:
                if t["toolset"] not in merged_toolsets_dict:
                    merged_toolsets_dict[t["toolset"]] = set()
                merged_toolsets_dict[t["toolset"]].update(t.get("toolIds", []))
            body["toolsets"] = [
                {"toolset": k, "toolIds": list(v)}
                for k, v in merged_toolsets_dict.items()
            ]

        url = f"{CES_API_BASE}/{agent_name}"
        try:
            resp = httpx.patch(url, headers=headers, json=body, timeout=60)
            resp.raise_for_status()
            logger.info("Updated CES agent config for %s", display_name)
        except httpx.HTTPError as e:
            logger.warning(
                "Agent update failed (non-fatal) for %s: %s", display_name, e
            )
        return agent_name

    logger.info("Creating CES agent: %s", display_name)
    url = f"{CES_API_BASE}/{app_name}/agents"
    resp = httpx.post(url, headers=headers, json=body, timeout=60)
    resp.raise_for_status()
    raw = resp.json()
    logger.info(
        "CES agent create response for %s: %s", display_name, raw.get("name", "?")
    )
    agent = resolve_lro_response(raw, headers)
    agent_name = agent["name"]
    logger.info("CES agent created: %s", agent_name)
    return agent_name
