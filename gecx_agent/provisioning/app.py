"""CES App lifecycle management.

Handles finding, creating, and configuring CES App resources.
"""

import logging

import httpx

from .api import CES_API_BASE, ces_url, resolve_lro_response

logger = logging.getLogger(__name__)


def find_existing_app(
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
    url = ces_url(project_id, region, "/apps")
    resp = httpx.get(url, headers=headers, timeout=30)
    resp.raise_for_status()
    for app in resp.json().get("apps", []):
        if app.get("displayName") == display_name:
            logger.info("Found existing CES app: %s", app.get("name"))
            return app
    return None


def create_app(
    project_id: str, region: str, display_name: str, headers: dict
) -> dict:
    """Create a new CES app.

    Args:
        project_id: GCP project ID.
        region: GCP region.
        display_name: Display name for the new app.
        headers: Authenticated request headers.

    Returns:
        The created app resource dict.
    """
    logger.info("Creating CES app: %s", display_name)
    url = ces_url(project_id, region, "/apps")
    body = {"displayName": display_name}
    resp = httpx.post(url, headers=headers, json=body, timeout=60)
    resp.raise_for_status()
    raw = resp.json()
    logger.info("CES app create response: %s", raw.get("name", "?"))
    app = resolve_lro_response(raw, headers)
    logger.info("CES app created: %s", app["name"])
    return app


def set_root_agent(
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
    url = f"{CES_API_BASE}/{app_name}"
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
