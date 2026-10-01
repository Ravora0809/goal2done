"""Google Sheets integration for Goal2Done."""
import os
from typing import Optional, List, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv("GOOGLE_SHEETS_CREDENTIALS_FILE", os.path.join(BASE_DIR, "credentials.json"))
TOKEN_FILE = os.getenv("GOOGLE_SHEETS_TOKEN_FILE", os.path.join(BASE_DIR, "token_sheets.json"))


def _get_credentials(user_id: str) -> Credentials:
    from google_auth import get_user_credentials
    return get_user_credentials(user_id, SCOPES)


def _service(user_id: str):
    return build("sheets", "v4", credentials=_get_credentials(user_id), cache_discovery=False)

def sheets_create_spreadsheet(title: str, user_id: str | None = None):
    try:
        result = _service(user_id).spreadsheets().create(body={"properties": {"title": title}}).execute()
        sid = result["spreadsheetId"]
        return {"status": "success", "type": "google_sheet", "spreadsheet": {
            "id": sid, "title": result.get("properties", {}).get("title", title),
            "url": result.get("spreadsheetUrl", f"https://docs.google.com/spreadsheets/d/{sid}/edit")
        }}
    except Exception as exc:
        return {"status": "error", "type": "google_sheet", "message": str(exc)}


def sheets_read_values(spreadsheet_id: str, range_name: str, user_id: str | None = None):
    try:
        result = _service(user_id).spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=range_name,
            valueRenderOption="FORMATTED_VALUE"
        ).execute()
        values = result.get("values", [])
        return {"status": "success", "type": "google_sheet_values", "spreadsheet_id": spreadsheet_id,
                "range": range_name, "values": values, "rows": len(values)}
    except Exception as exc:
        return {"status": "error", "type": "google_sheet_values", "message": str(exc)}


def sheets_write_values(spreadsheet_id: str, range_name: str, values: List[List[Any]], input_option: str = "USER_ENTERED", user_id: str | None = None):
    try:
        result = _service(user_id).spreadsheets().values().update(
            spreadsheetId=spreadsheet_id, range=range_name,
            valueInputOption=input_option, body={"values": values}
        ).execute()
        return {"status": "success", "type": "google_sheet_update", "spreadsheet_id": spreadsheet_id,
                "range": range_name, "updated_cells": result.get("updatedCells", 0),
                "updated_range": result.get("updatedRange", range_name)}
    except Exception as exc:
        return {"status": "error", "type": "google_sheet_update", "message": str(exc)}


def sheets_append_values(spreadsheet_id: str, range_name: str, values: List[List[Any]], input_option: str = "USER_ENTERED", user_id: str | None = None):
    try:
        result = _service(user_id).spreadsheets().values().append(
            spreadsheetId=spreadsheet_id, range=range_name,
            valueInputOption=input_option, insertDataOption="INSERT_ROWS",
            body={"values": values}
        ).execute()
        updates = result.get("updates", {})
        return {"status": "success", "type": "google_sheet_append", "spreadsheet_id": spreadsheet_id,
                "range": range_name, "updated_cells": updates.get("updatedCells", 0),
                "updated_range": updates.get("updatedRange", range_name)}
    except Exception as exc:
        return {"status": "error", "type": "google_sheet_append", "message": str(exc)}


def sheets_clear_values(spreadsheet_id: str, range_name: str, user_id: str | None = None):
    try:
        result = _service(user_id).spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id, range=range_name, body={}
        ).execute()
        return {"status": "success", "type": "google_sheet_clear", "spreadsheet_id": spreadsheet_id,
                "range": range_name, "cleared_range": result.get("clearedRange", range_name)}
    except Exception as exc:
        return {"status": "error", "type": "google_sheet_clear", "message": str(exc)}


