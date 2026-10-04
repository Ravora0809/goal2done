"""Google Docs integration for Goal2Done.

Drive stays read-only. Google Docs itself is editable through the Docs API:
create, read, append, replace/update content, and clear content.

Actual deletion of the Google Docs file is intentionally NOT implemented here:
that requires Drive write permission, while Goal2Done keeps Drive read-only.
"""
import os
from typing import Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/documents"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv("GOOGLE_DOCS_CREDENTIALS_FILE", os.path.join(BASE_DIR, "credentials.json"))
TOKEN_FILE = os.getenv("GOOGLE_DOCS_TOKEN_FILE", os.path.join(BASE_DIR, "token_docs.json"))


def _get_credentials(user_id: Optional[str] = None) -> Credentials:
    """Get per-user web credentials when multi-user auth is available.

    Falls back to the old local Desktop OAuth token flow for local testing.
    """
    if user_id:
        from google_auth import get_user_credentials
        return get_user_credentials(user_id, SCOPES)

    creds: Optional[Credentials] = None
    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if creds and creds.valid:
        return creds
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        if not os.path.exists(CREDENTIALS_FILE):
            raise FileNotFoundError(f"Google OAuth credentials not found: {CREDENTIALS_FILE}")
        flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
        creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    with open(TOKEN_FILE, "w", encoding="utf-8") as f:
        f.write(creds.to_json())
    return creds


def _service(user_id: Optional[str] = None):
    return build("docs", "v1", credentials=_get_credentials(user_id), cache_discovery=False)


def _extract_text(document: dict) -> str:
    parts = []
    for element in document.get("body", {}).get("content", []):
        for item in element.get("paragraph", {}).get("elements", []):
            text_run = item.get("textRun")
            if text_run:
                parts.append(text_run.get("content", ""))
    return "".join(parts)


def _document_result(doc: dict, fallback_title: str = "") -> dict:
    document_id = doc["documentId"]
    return {
        "id": document_id,
        "title": doc.get("title", fallback_title),
        "url": f"https://docs.google.com/document/d/{document_id}/edit",
    }


def docs_create_document(title: str, content: str = "", user_id: Optional[str] = None):
    try:
        service = _service(user_id)
        doc = service.documents().create(body={"title": title}).execute()
        document_id = doc["documentId"]

        if content:
            service.documents().batchUpdate(
                documentId=document_id,
                body={"requests": [{"insertText": {"location": {"index": 1}, "text": content}}]},
            ).execute()

        verified = docs_read_document(document_id, user_id=user_id)
        if verified.get("status") != "success":
            return {
                "status": "error",
                "type": "google_doc",
                "message": "Document was created, but read-back verification failed.",
                "document": _document_result(doc, title),
                "verification": verified,
            }

        return {
            "status": "success",
            "type": "google_doc",
            "action": "created",
            "document": _document_result(doc, title),
            "content_verified": (not content) or content in verified.get("content", ""),
        }
    except Exception as exc:
        return {"status": "error", "type": "google_doc", "message": str(exc)}


def docs_read_document(document_id: str, max_chars: int = 50000, user_id: Optional[str] = None):
    try:
        doc = _service(user_id).documents().get(documentId=document_id).execute()
        content = _extract_text(doc)
        return {
            "status": "success",
            "type": "google_doc_content",
            "action": "read",
            "document": _document_result(doc),
            "content": content[:max_chars],
            "truncated": len(content) > max_chars,
        }
    except Exception as exc:
        return {"status": "error", "type": "google_doc_content", "message": str(exc)}


def _body_end_index(service, document_id: str, user_id: Optional[str] = None) -> int:
    doc = service.documents().get(documentId=document_id, fields="body.content.endIndex").execute()
    body = doc.get("body", {}).get("content", [])
    return body[-1].get("endIndex", 1) if body else 1


def docs_append_text(document_id: str, content: str, user_id: Optional[str] = None):
    try:
        service = _service(user_id)
        end_index = _body_end_index(service, document_id, user_id)
        insert_index = max(1, end_index - 1)

        service.documents().batchUpdate(
            documentId=document_id,
            body={"requests": [{"insertText": {"location": {"index": insert_index}, "text": content}}]},
        ).execute()

        verified = docs_read_document(document_id, user_id=user_id)
        ok = verified.get("status") == "success" and content in verified.get("content", "")
        return {
            "status": "success" if ok else "error",
            "type": "google_doc_update",
            "action": "appended",
            "document_id": document_id,
            "url": f"https://docs.google.com/document/d/{document_id}/edit",
            "content_verified": ok,
            "message": "Text appended and verified." if ok else "Text was appended but read-back verification failed.",
        }
    except Exception as exc:
        return {"status": "error", "type": "google_doc_update", "message": str(exc)}


def docs_update_document(document_id: str, content: str, user_id: Optional[str] = None):
    """Replace the document body with the supplied text."""
    try:
        service = _service(user_id)
        doc = service.documents().get(documentId=document_id).execute()
        body = doc.get("body", {}).get("content", [])
        end_index = body[-1].get("endIndex", 1) if body else 1

        requests = []
        if end_index > 2:
            requests.append({
                "deleteContentRange": {
                    "range": {"startIndex": 1, "endIndex": end_index - 1}
                }
            })
        if content:
            requests.append({
                "insertText": {
                    "location": {"index": 1},
                    "text": content,
                }
            })

        if requests:
            service.documents().batchUpdate(documentId=document_id, body={"requests": requests}).execute()

        verified = docs_read_document(document_id, user_id=user_id)
        actual = verified.get("content", "") if verified.get("status") == "success" else ""
        ok = verified.get("status") == "success" and actual == content

        return {
            "status": "success" if ok else "error",
            "type": "google_doc_update",
            "action": "updated",
            "document_id": document_id,
            "url": f"https://docs.google.com/document/d/{document_id}/edit",
            "content_verified": ok,
            "content": actual,
            "message": "Document updated and verified." if ok else "Document update could not be verified.",
        }
    except Exception as exc:
        return {"status": "error", "type": "google_doc_update", "message": str(exc)}


def docs_clear_document(document_id: str, user_id: Optional[str] = None):
    """Delete all document content while keeping the Google Docs file."""
    return docs_update_document(document_id=document_id, content="", user_id=user_id)
