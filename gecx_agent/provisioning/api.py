"""Low-level CES REST API helpers.

Provides URL construction and long-running operation (LRO) polling.
All other provisioning modules depend on this one.
"""

import logging
import time

import httpx

logger = logging.getLogger(__name__)

CES_API_BASE = "https://ces.googleapis.com/v1beta"


def ces_url(project_id: str, region: str, path: str = "") -> str:
    """Build a CES API URL.

    Args:
        project_id: GCP project ID.
        region: GCP region (macro, e.g. "us").
        path: Additional path segments (e.g., /apps/xxx/agents).

    Returns:
        Fully qualified CES REST endpoint URL.
    """
    base = f"{CES_API_BASE}/projects/{project_id}/locations/{region}"
    return f"{base}{path}"


def poll_lro(
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
    url = f"{CES_API_BASE}/{operation_name}"
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


def resolve_lro_response(resp_json: dict, headers: dict) -> dict:
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
        return poll_lro(resp_json["name"], headers)
    return resp_json
