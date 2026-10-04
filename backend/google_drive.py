"""Google Drive integration for Goal2Done.

Uses the same Google OAuth Desktop credentials as Calendar/Gmail and
stores Drive authorization separately in token_drive.json.

Current scope is read-only so Goal2Done can search, list, and read the
user's existing Drive files without being able to modify or delete them.
"""

import io
import os
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
]

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv(
    "GOOGLE_DRIVE_CREDENTIALS_FILE",
    os.getenv(
        "GOOGLE_CALENDAR_CREDENTIALS_FILE",
        os.path.join(BASE_DIR, "credentials.json"),
    ),
)
TOKEN_FILE = os.getenv(
    "GOOGLE_DRIVE_TOKEN_FILE",
    os.path.join(BASE_DIR, "token_drive.json"),
)


def _get_credentials(user_id: str) -> Credentials:
    from google_auth import get_user_credentials
    return get_user_credentials(user_id, SCOPES)


def _service(user_id: str):
    return build("drive", "v3", credentials=_get_credentials(user_id), cache_discovery=False)

def _escape_drive_query_value(value: str) -> str:
    return value.replace("\\", "\\\\").replace("'", "\\'")


def drive_list_files(
    folder_id: Optional[str] = None,
    max_results: int = 8,
    user_id: str | None = None,
):
    """List files/folders visible to the authenticated Drive account."""
    try:
        service = _service(user_id)
        query_parts = ["trashed = false"]

        if folder_id:
            folder_id = _escape_drive_query_value(folder_id)
            query_parts.append(f"'{folder_id}' in parents")

        response = service.files().list(
            q=" and ".join(query_parts),
            pageSize=max(1, min(int(max_results), 100)),
            orderBy="folder,name",
            fields=(
                "files(id,name,mimeType,size,modifiedTime,createdTime,"
                "webViewLink,parents)"
            ),
        ).execute()

        files = response.get("files", [])

        return {
            "status": "success",
            "type": "drive_files",
            "files": files,
            "count": len(files),
        }

    except Exception as exc:
        return {
            "status": "error",
            "type": "drive_files",
            "message": str(exc),
        }


def drive_search(query: str, max_results: int = 8, user_id: str | None = None):
    """Search Drive by filename and indexed/full text."""
    try:
        service = _service(user_id)
        safe_query = _escape_drive_query_value(query.strip())

        q = (
            "trashed = false and "
            f"(name contains '{safe_query}' or fullText contains '{safe_query}')"
        )

        response = service.files().list(
            q=q,
            pageSize=max(1, min(int(max_results), 100)),
            orderBy="modifiedTime desc",
            fields=(
                "files(id,name,mimeType,size,modifiedTime,createdTime,"
                "webViewLink,parents)"
            ),
        ).execute()

        files = response.get("files", [])

        return {
            "status": "success",
            "type": "drive_search",
            "query": query,
            "files": files,
            "count": len(files),
        }

    except Exception as exc:
        return {
            "status": "error",
            "type": "drive_search",
            "query": query,
            "message": str(exc),
        }


def _download_binary(service, file_id: str) -> bytes:
    request = service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False

    while not done:
        _, done = downloader.next_chunk()

    return buffer.getvalue()


def _export_google_workspace_file(service, file_id: str, mime_type: str) -> str:
    export_map = {
        "application/vnd.google-apps.document": "text/plain",
        "application/vnd.google-apps.spreadsheet": "text/csv",
        "application/vnd.google-apps.presentation": "text/plain",
    }

    export_type = export_map.get(mime_type)
    if not export_type:
        raise ValueError(f"Unsupported Google Workspace file type: {mime_type}")

    data = service.files().export_media(
        fileId=file_id,
        mimeType=export_type,
    ).execute()

    return data.decode("utf-8", errors="replace")


def drive_read_file(file_id: str, max_chars: int = 6500, user_id: str | None = None):
    """Read text from a Drive file or return useful metadata for binaries."""
    try:
        service = _service(user_id)
        metadata = service.files().get(
            fileId=file_id,
            fields=(
                "id,name,mimeType,size,modifiedTime,createdTime,"
                "webViewLink,parents"
            ),
        ).execute()

        mime_type = metadata.get("mimeType", "")

        if mime_type.startswith("application/vnd.google-apps."):
            content = _export_google_workspace_file(
                service,
                file_id,
                mime_type,
            )
            return {
                "status": "success",
                "type": "drive_file_content",
                "file": metadata,
                "content": content[:max_chars],
                "truncated": len(content) > max_chars,
            }

        # Text-like files can be downloaded and decoded directly.
        if (
            mime_type.startswith("text/")
            or mime_type in {
                "application/json",
                "application/xml",
                "application/javascript",
            }
        ):
            data = _download_binary(service, file_id)
            content = data.decode("utf-8", errors="replace")
            return {
                "status": "success",
                "type": "drive_file_content",
                "file": metadata,
                "content": content[:max_chars],
                "truncated": len(content) > max_chars,
            }

        return {
            "status": "success",
            "type": "drive_file_metadata",
            "file": metadata,
            "message": (
                "This file type is available in Drive, but text extraction is "
                "not implemented for this binary format yet."
            ),
        }

    except HttpError as exc:
        return {
            "status": "error",
            "type": "drive_file_content",
            "message": str(exc),
        }
    except Exception as exc:
        return {
            "status": "error",
            "type": "drive_file_content",
            "message": str(exc),
        }
