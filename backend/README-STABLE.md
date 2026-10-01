# Goal2Done — Stable Google Integrations Backend

This build starts from the previously integrated Goal2Done backend that
already contained Gmail, Google Drive, Google Docs, Google Sheets, Calendar,
browser actions, messaging, maps, reminders, planner, executor and verifier.

## Included integrations

- Gmail: read recent mail + send email with approval
- Google Drive: list/search/read
- Google Docs: create/read/append
- Google Sheets: create/read/write/append/clear
- Google Calendar: list/create/update/delete
- Browser actions
- Local document generation
- Reminders
- Approval firewall
- Verification

## Important fixes in this build

### Google Sheets dynamic IDs
Creating a spreadsheet and then writing to it used to generate a literal
`{{action_1.spreadsheet_id}}` placeholder.

This build supports:

`sheets_create_spreadsheet(title, range_name, values, input_option)`

The tool creates the real spreadsheet ID, writes the values, reads them back,
and only then reports successful verification.

### Executor
All integration tools are explicitly dispatched in `executor.py`.

### Firewall
Read operations remain automatic. Consequential operations such as
creating Docs/Sheets/Calendar events and sending Gmail require approval.

## Google OAuth

Keep your existing Desktop OAuth `credentials.json`.

The integrations intentionally use separate token files:

- `token_gmail.json`
- `token_drive.json`
- `token_calendar.json`
- `token_docs.json`
- `token_sheets.json`

If one token has an old scope, delete ONLY that token and run its module once
to authorize again.

## Start

```bash
pip install -r requirements.txt
playwright install chromium
uvicorn main:app --reload
```

## Quick integration tests

```bash
python gmail.py
python google_drive.py
python google_docs.py
python google_sheets.py
python google_calendar.py
```

Then test through the chat:

### Gmail
`Show me my latest 5 emails.`

`Send an email to ...` -> approval -> send -> verified.

### Drive
`Search my Google Drive for resume.`

### Google Docs
`Create a Google Doc called Python Interview Notes with ...`

### Google Sheets
`Create a Google Sheet called Job Tracker with columns Company, Role, Status and add OpenAI, Software Engineer, Applied.`

The Sheets action is create -> real ID -> write -> readback -> verify.

### Calendar
`Show my calendar events for today.`

`Create a calendar event ...` -> approval -> create -> verify.
