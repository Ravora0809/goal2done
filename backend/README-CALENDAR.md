# Goal2Done Calendar Integration

## What this version fixes

### 1. Calendar verification
`calendar_list_events` was being executed but the verifier had no calendar branch. That caused a successful Google Calendar read to be reported as failed.

The verifier now treats:
- `calendar_list_events` + `status=success` + a list of events (including an empty list) as verified.
- `calendar_create_event` and `calendar_update_event` as verified when a returned event ID exists.
- `calendar_delete_event` as verified when the returned event ID exists.

### 2. Calendar API for the frontend
Added:

`GET /calendar/events`

Query parameters:
- `start_time` — ISO/RFC3339
- `end_time` — ISO/RFC3339
- `max_results` — 1–100

The route reads the authenticated user's primary Google Calendar.

## OAuth files
Keep these local and never commit them:

- `credentials.json`
- `token_calendar.json`
- `.env`

## Run

```bash
uvicorn main:app --reload
```

Then the frontend can load a month of events through `/calendar/events`.
