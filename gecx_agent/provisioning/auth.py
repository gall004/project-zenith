"""Authentication helpers for the CES API.

Uses Application Default Credentials (ADC) — zero hardcoded keys.
"""

import google.auth
import google.auth.transport.requests


def get_auth_headers() -> dict:
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
