"""Gmail integration for Goal2Done.

Local development uses the same Google OAuth Desktop-app client stored as
credentials.json. Gmail uses a separate token file because its OAuth scopes
are different from Google Calendar's token.
"""

import base64
import os
from email.message import EmailMessage
from typing import Optional, List

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv(
    "GOOGLE_GMAIL_CREDENTIALS_FILE",
    os.path.join(BASE_DIR, "credentials.json"),
)
TOKEN_FILE = os.getenv(
    "GOOGLE_GMAIL_TOKEN_FILE",
    os.path.join(BASE_DIR, "token_gmail.json"),
)


def _get_credentials(user_id: str) -> Credentials:
    from google_auth import get_user_credentials
    return get_user_credentials(user_id, SCOPES)


def _service(user_id: str):
    return build("gmail", "v1", credentials=_get_credentials(user_id), cache_discovery=False)

def send_email(
    to: str | List[str],
    subject: str,
    body: str,
    cc: Optional[str | List[str]] = None,
    bcc: Optional[str | List[str]] = None,
    user_id: str | None = None,
):
    """Send a plain-text email from the authenticated Gmail account."""
    try:
        recipients = [to] if isinstance(to, str) else to
        recipients = [x.strip() for x in recipients if x and x.strip()]
        if not recipients:
            raise ValueError("At least one recipient email address is required.")

        def normalize(value):
            if not value:
                return []
            values = [value] if isinstance(value, str) else value
            return [x.strip() for x in values if x and x.strip()]

        cc_values = normalize(cc)
        bcc_values = normalize(bcc)

        message = EmailMessage()
        message["To"] = ", ".join(recipients)
        if cc_values:
            message["Cc"] = ", ".join(cc_values)
        if bcc_values:
            message["Bcc"] = ", ".join(bcc_values)
        message["Subject"] = subject
        message.set_content(body)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        response = _service(user_id).users().messages().send(
            userId="me",
            body={"raw": raw},
        ).execute()

        return {
            "status": "success",
            "type": "email",
            "message_id": response.get("id"),
            "thread_id": response.get("threadId"),
            "to": recipients,
            "subject": subject,
        }

    except Exception as exc:
        return {
            "status": "error",
            "type": "email",
            "message": str(exc),
        }


def list_recent_emails(max_results: int = 5, user_id: str | None = None):
    """List recent Gmail metadata with one list call + one batch metadata request."""
    try:
        max_results = max(1, min(int(max_results), 10))
        service = _service(user_id)
        response = service.users().messages().list(
            userId="me",
            maxResults=max_results,
            fields="messages(id,threadId),nextPageToken",
        ).execute()

        messages = []
        batch = service.new_batch_http_request()

        def collect(request_id, result, exception):
            if exception:
                return
            headers = {
                h.get("name", "").lower(): h.get("value", "")
                for h in result.get("payload", {}).get("headers", [])
            }
            messages.append({
                "id": result.get("id"),
                "thread_id": result.get("threadId"),
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", ""),
                "date": headers.get("date", ""),
                "snippet": result.get("snippet", "")[:500],
            })

        for item in response.get("messages", []):
            batch.add(
                service.users().messages().get(
                    userId="me",
                    id=item["id"],
                    format="metadata",
                    metadataHeaders=["From", "To", "Subject", "Date"],
                    fields="id,threadId,payload/headers,snippet",
                ),
                callback=collect,
            )

        if messages or response.get("messages"):
            batch.execute()

        messages.sort(key=lambda x: x.get("date", ""), reverse=True)
        return {
            "status": "success",
            "type": "email_list",
            "emails": messages[:max_results],
            "count": len(messages[:max_results]),
        }
    except Exception as exc:
        return {
            "status": "error",
            "type": "email_list",
            "message": str(exc),
        }
