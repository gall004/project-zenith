"""CES .env file export helpers.

Writes provisioned resource IDs to the project's .env files so the
frontend and deploy scripts can reference them at build/run time.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def upsert_env_var(lines: list[str], key: str, value: str) -> list[str]:
    """Insert or update an env var in a list of .env lines."""
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            return lines
    lines.append(f"{key}={value}")
    return lines


def export_to_env(
    agent_id: str,
    app_id: str,
    project_root: Path,
    env_file_path: str = ".env",
) -> None:
    """Write CES_APP_ID and GECX_AGENT_ID to the local .env file.

    CES_APP_ID is required for the RunSession API session path.
    GECX_AGENT_ID is retained for reference and future use.

    Idempotent: updates values if they already exist, appends if not.

    Args:
        agent_id: The GECX Agent resource ID.
        app_id: The CES App resource ID (used in RunSession path).
        project_root: Absolute path to the project root.
        env_file_path: Relative path to the .env file.
    """
    env_path = project_root / env_file_path
    lines: list[str] = []

    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    lines = upsert_env_var(lines, "CES_APP_ID", app_id)
    lines = upsert_env_var(lines, "GECX_AGENT_ID", agent_id)

    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    logger.info("Exported CES_APP_ID=%s to %s", app_id, env_path)
    logger.info("Exported GECX_AGENT_ID=%s to %s", agent_id, env_path)
