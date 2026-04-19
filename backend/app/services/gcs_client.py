"""GCS Client — Lightweight async uploader for user attachments.

Uses httpx and Application Default Credentials to upload Base64-decoded
binary data to the designated GCS bucket via the REST API.
This avoids introducing bulky google-cloud-storage dependencies.
"""

import logging
import base64
import uuid

from google.auth.transport import requests as google_auth_requests
from google.auth import default as google_auth_default
import httpx
import urllib.parse

from app.core.config import settings

logger = logging.getLogger(__name__)


class GCSClient:
    """Async Client for uploading objects to Google Cloud Storage."""

    def __init__(self) -> None:
        self._bucket = settings.GCS_ATTACHMENT_BUCKET

    async def _get_access_token(self) -> str:
        """Obtain an ADC access token for GCS API calls."""
        credentials, _ = google_auth_default(
            scopes=["https://www.googleapis.com/auth/devstorage.read_write"]
        )
        credentials.refresh(google_auth_requests.Request())
        return credentials.token

    async def upload_base64_attachment(self, mime_type: str, base64_data: str) -> str:
        """Decode base64 and upload to GCS.

        Args:
            mime_type: The MIME type of the file (e.g. image/png)
            base64_data: The raw base64 string

        Returns:
            The gs:// URI of the uploaded object.
        """
        if not self._bucket:
            logger.warning("GCS_ATTACHMENT_BUCKET not configured. Upload skipped.")
            return ""

        try:
            # Clean base64 string if it contains data prefix
            if "," in base64_data:
                base64_data = base64_data.split(",")[1]
                
            binary_data = base64.b64decode(base64_data)
        except Exception as e:
            logger.error(f"Failed to decode base64 data: {e}")
            raise ValueError("Invalid Base64 payload")

        # Generate a unique object name
        ext = mime_type.split("/")[-1] if "/" in mime_type else "bin"
        object_name = f"attachments/{uuid.uuid4().hex}.{ext}"

        # Upload via GCS JSON/REST API (Simple Upload)
        url = f"https://storage.googleapis.com/upload/storage/v1/b/{self._bucket}/o"
        params = {
            "uploadType": "media",
            "name": object_name
        }

        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": mime_type,
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url, 
                params=params, 
                headers=headers, 
                content=binary_data
            )
            response.raise_for_status()

        gs_uri = f"gs://{self._bucket}/{object_name}"
        logger.info(f"Successfully uploaded attachment to {gs_uri}")
        return gs_uri

    async def delete_attachment(self, gs_uri: str) -> None:
        """Delete an attachment from GCS using its gs:// URI.
        
        Args:
            gs_uri: The gs://bucket-name/object-name URI.
        """
        if not gs_uri.startswith(f"gs://{self._bucket}/"):
            logger.warning(f"URI {gs_uri} does not match active bucket {self._bucket}. Skipping deletion.")
            return

        object_name_raw = gs_uri.replace(f"gs://{self._bucket}/", "")
        object_name = urllib.parse.quote(object_name_raw, safe='')
        url = f"https://storage.googleapis.com/storage/v1/b/{self._bucket}/o/{object_name}"
        
        token = await self._get_access_token()
        headers = {
            "Authorization": f"Bearer {token}",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.delete(url, headers=headers)
                # HTTP 204 indicates successful deletion, 404 indicates already deleted
                if response.status_code not in (204, 404):
                    response.raise_for_status()
            logger.info(f"Successfully purged attachment {gs_uri}")
        except Exception as e:
            logger.error(f"Failed to delete attachment {gs_uri}: {e}")

gcs_client = GCSClient()
