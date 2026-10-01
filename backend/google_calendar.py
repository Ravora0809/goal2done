"""Google Calendar integration for Goal2Done.

Local development uses a Google OAuth Desktop-app client stored as
credentials.json. The first Calendar action opens Google's consent screen
in the browser and stores the refresh token in token_calendar.json.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, List

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = ["https://www.googleapis.com/auth/calendar"]
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CREDENTIALS_FILE = os.getenv(
    "GOOGLE_CALENDAR_CREDENTIALS_FILE",
    os.path.join(BASE_DIR, "credentials.json"),
)
TOKEN_FILE = os.getenv(
    "GOOGLE_CALENDAR_TOKEN_FILE",
    os.path.join(BASE_DIR, "token_calendar.json"),
)


def _get_credentials(user_id: str) -> Credentials:
    from google_auth import get_user_credentials
    return get_user_credentials(user_id, SCOPES)


def _service(user_id: str):
    return build("calendar", "v3", credentials=_get_credentials(user_id), cache_discovery=False)

def _as_rfc3339(value: str) -> str:
    """Validate an ISO/RFC3339 datetime and return an API-safe string."""
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(
            "Calendar datetime must include a timezone, e.g. "
            "2026-10-02T10:00:00+05:30"
        )
    return parsed.isoformat()


def calendar_list_events(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    max_results: int = 20,
    user_id: str | None = None,
):
    """List the user's upcoming calendar events."""
    try:
        service = _service(user_id)

        now = datetime.now().astimezone()
        time_min = _as_rfc3339(start_time) if start_time else now.isoformat()
        time_max = _as_rfc3339(end_time) if end_time else None

        kwargs = {
            "calendarId": "primary",
            "timeMin": time_min,
            "maxResults": max(1, min(int(max_results), 100)),
            "singleEvents": True,
            "orderBy": "startTime",
        }
        if time_max:
            kwargs["timeMax"] = time_max

        response = service.events().list(**kwargs).execute()
        events = []

        for event in response.get("items", []):
            start = event.get("start", {})
            end = event.get("end", {})
            events.append({
                "id": event.get("id"),
                "title": event.get("summary", "Untitled event"),
                "start": start.get("dateTime") or start.get("date"),
                "end": end.get("dateTime") or end.get("date"),
                "description": event.get("description", ""),
                "location": event.get("location", ""),
                "html_link": event.get("htmlLink"),
                "status": event.get("status"),
            })

        return {
            "status": "success",
            "type": "calendar_events",
            "events": events,
            "count": len(events),
        }

    except (HttpError, ValueError, FileNotFoundError, Exception) as exc:
        return {
            "status": "error",
            "type": "calendar_events",
            "message": str(exc),
        }


def calendar_create_event(
    title: str,
    start_time: str,
    end_time: Optional[str] = None,
    description: str = "",
    location: str = "",
    attendees: Optional[List[str]] = None,
    user_id: str | None = None,
):
    """Create an event in the authenticated user's primary calendar."""
    try:
        start = _as_rfc3339(start_time)
        if end_time:
            end = _as_rfc3339(end_time)
        else:
            parsed = datetime.fromisoformat(start.replace("Z", "+00:00"))
            end = (parsed + timedelta(hours=1)).isoformat()

        body = {
            "summary": title,
            "description": description,
            "location": location,
            "start": {"dateTime": start},
            "end": {"dateTime": end},
        }

        if attendees:
            body["attendees"] = [
                {"email": email.strip()}
                for email in attendees
                if email and email.strip()
            ]

        service = _service(user_id)
        event = service.events().insert(
            calendarId="primary",
            body=body,
            sendUpdates="all" if attendees else "none",
        ).execute()

        return {
            "status": "success",
            "type": "calendar_event",
            "event": {
                "id": event.get("id"),
                "title": event.get("summary"),
                "start": event.get("start", {}).get("dateTime"),
                "end": event.get("end", {}).get("dateTime"),
                "html_link": event.get("htmlLink"),
            },
        }

    except (HttpError, ValueError, FileNotFoundError, Exception) as exc:
        return {
            "status": "error",
            "type": "calendar_event",
            "message": str(exc),
        }


def calendar_update_event(
    event_id: str,
    title: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    description: Optional[str] = None,
    location: Optional[str] = None,
    user_id: str | None = None,
):
    """Update selected fields of an existing primary-calendar event."""
    try:
        service = _service(user_id)
        event = service.events().get(
            calendarId="primary",
            eventId=event_id,
        ).execute()

        if title is not None:
            event["summary"] = title
        if description is not None:
            event["description"] = description
        if location is not None:
            event["location"] = location
        if start_time is not None:
            event["start"] = {"dateTime": _as_rfc3339(start_time)}
        if end_time is not None:
            event["end"] = {"dateTime": _as_rfc3339(end_time)}

        updated = service.events().update(
            calendarId="primary",
            eventId=event_id,
            body=event,
            sendUpdates="all",
        ).execute()

        return {
            "status": "success",
            "type": "calendar_event",
            "event": {
                "id": updated.get("id"),
                "title": updated.get("summary"),
                "start": updated.get("start", {}).get("dateTime"),
                "end": updated.get("end", {}).get("dateTime"),
                "html_link": updated.get("htmlLink"),
            },
        }

    except (HttpError, ValueError, FileNotFoundError, Exception) as exc:
        return {
            "status": "error",
            "type": "calendar_event",
            "message": str(exc),
        }


def calendar_delete_event(event_id: str, user_id: str | None = None):
    """Delete an event from the authenticated user's primary calendar."""
    try:
        service = _service(user_id)
        service.events().delete(
            calendarId="primary",
            eventId=event_id,
            sendUpdates="all",
        ).execute()

        return {
            "status": "success",
            "type": "calendar_event",
            "event_id": event_id,
            "message": "Calendar event deleted.",
        }

    except (HttpError, ValueError, FileNotFoundError, Exception) as exc:
        return {
            "status": "error",
            "type": "calendar_event",
            "message": str(exc),
        }
