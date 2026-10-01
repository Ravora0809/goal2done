"""Google Docs integration for Goal2Done."""
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


def _get_credentials(user_id: str) -> Credentials:
    from google_auth import get_user_credentials
    return get_user_credentials(user_id, SCOPES)


def _service(user_id: str):
    return build("docs", "v1", credentials=_get_credentials(user_id), cache_discovery=False)

def _extract_text(document: dict) -> str:
    parts = []
    for element in document.get("body", {}).get("content", []):
        for item in element.get("paragraph", {}).get("elements", []):
            text_run = item.get("textRun")
            if text_run:
                parts.append(text_run.get("content", ""))
    return "".join(parts)


def docs_create_document(title: str, content: str = "", user_id: str | None = None):
    try:
        service = _service(user_id)
        doc = service.documents().create(body={"title": title}).execute()
        document_id = doc["documentId"]
        if content:
            service.documents().batchUpdate(
                documentId=document_id,
                body={"requests": [{"insertText": {"location": {"index": 1}, "text": content}}]},
            ).execute()
        return {"status": "success", "type": "google_doc", "document": {
            "id": document_id,
            "title": doc.get("title", title),
            "url": f"https://docs.google.com/document/d/{document_id}/edit",
        }}
    except Exception as exc:
        return {"status": "error", "type": "google_doc", "message": str(exc)}


def docs_read_document(document_id: str, max_chars: int = 50000, user_id: str | None = None):
    try:
        doc = _service(user_id).documents().get(documentId=document_id).execute()
        content = _extract_text(doc)
        return {"status": "success", "type": "google_doc_content", "document": {
            "id": document_id, "title": doc.get("title"),
            "url": f"https://docs.google.com/document/d/{document_id}/edit",
        }, "content": content[:max_chars], "truncated": len(content) > max_chars}
    except Exception as exc:
        return {"status": "error", "type": "google_doc_content", "message": str(exc)}


def docs_append_text(document_id: str, content: str, user_id: str | None = None):
    try:
        doc = _service(user_id).documents().get(documentId=document_id, fields="body.content.endIndex").execute()
        body = doc.get("body", {}).get("content", [])
        end_index = body[-1].get("endIndex", 1) if body else 1
        insert_index = max(1, end_index - 1)
        _service(user_id).documents().batchUpdate(
            documentId=document_id,
            body={"requests": [{"insertText": {"location": {"index": insert_index}, "text": content}}]},
        ).execute()
        return {"status": "success", "type": "google_doc_update", "document_id": document_id,
                "url": f"https://docs.google.com/document/d/{document_id}/edit"}
    except Exception as exc:
        return {"status": "error", "type": "google_doc_update", "message": str(exc)}
