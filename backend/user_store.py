"""Persistent user + Google connection storage for Goal2Done.

Uses Supabase PostgREST so the Vercel function does not depend on a writable
local filesystem. The service-role key is backend-only and must never be sent
to the browser.
"""
import json
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _headers(extra=None):
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for multi-user auth.")
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


def _request(method, table, payload=None, query="", prefer="return=representation"):
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if query:
        url += f"?{query}"
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(url, data=body, headers=_headers({"Prefer": prefer}), method=method)
    with urlopen(request, timeout=20) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else []


def upsert_user(user_id, google_sub, email, name):
    rows = _request(
        "POST",
        "users",
        {"id": user_id, "google_sub": google_sub, "email": email, "name": name},
        prefer="resolution=merge-duplicates,return=representation",
    )
    return rows[0] if rows else {"id": user_id, "google_sub": google_sub, "email": email, "name": name}


def get_user(user_id):
    rows = _request("GET", "users", query=f"id=eq.{quote(user_id)}&select=id,google_sub,email,name")
    return rows[0] if rows else None


def save_google_connection(user_id, token_json):
    return _request(
        "POST",
        "google_connections",
        {"user_id": user_id, "token_json": token_json},
        prefer="resolution=merge-duplicates,return=representation",
    )


def get_google_connection(user_id):
    rows = _request(
        "GET",
        "google_connections",
        query=f"user_id=eq.{quote(user_id)}&select=user_id,token_json&limit=1",
    )
    return rows[0] if rows else None


def delete_google_connection(user_id):
    return _request(
        "DELETE",
        "google_connections",
        query=f"user_id=eq.{quote(user_id)}",
        prefer="return=minimal",
    )
