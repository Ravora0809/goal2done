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


def _get_credentials() -> Credentials:
    """Load/refresh Gmail OAuth credentials or start local OAuth consent."""
    creds: Optional[Credentials] = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not os.path.exists(CREDENTIALS_FILE):
            raise FileNotFoundError(
                f"Google OAuth credentials not found: {CREDENTIALS_FILE}. "
                "Save your Desktop app OAuth JSON as credentials.json."
            )

        flow = InstalledAppFlow.from_client_secrets_file(
            CREDENTIALS_FILE,
            SCOPES,
        )
        creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    with open(TOKEN_FILE, "w", encoding="utf-8") as token:
        token.write(creds.to_json())

    return creds


def _service():
    return build(
        "gmail",
        "v1",
        credentials=_get_credentials(),
        cache_discovery=False,
    )


def send_email(
    to: str | List[str],
    subject: str,
    body: str,
    cc: Optional[str | List[str]] = None,
    bcc: Optional[str | List[str]] = None,
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

        response = _service().users().messages().send(
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


def list_recent_emails(max_results: int = 10):
    """List recent Gmail message metadata without reading full message bodies."""
    try:
        max_results = max(1, min(int(max_results), 50))
        service = _service()

        response = service.users().messages().list(
            userId="me",
            maxResults=max_results,
        ).execute()

        messages = []
        for item in response.get("messages", []):
            message = service.users().messages().get(
                userId="me",
                id=item["id"],
                format="metadata",
                metadataHeaders=["From", "To", "Subject", "Date"],
            ).execute()

            headers = {
                h.get("name", "").lower(): h.get("value", "")
                for h in message.get("payload", {}).get("headers", [])
            }

            messages.append({
                "id": message.get("id"),
                "thread_id": message.get("threadId"),
                "from": headers.get("from", ""),
                "to": headers.get("to", ""),
                "subject": headers.get("subject", ""),
                "date": headers.get("date", ""),
                "snippet": message.get("snippet", ""),
            })

        return {
            "status": "success",
            "type": "email_list",
            "emails": messages,
            "count": len(messages),
        }

    except Exception as exc:
        return {
            "status": "error",
            "type": "email_list",
            "message": str(exc),
        }


if __name__ == "__main__":
    print("Starting Gmail authorization...")
    credentials = _get_credentials()
    print("Gmail authorization successful!")
    print(f"Token saved to: {TOKEN_FILE}")
