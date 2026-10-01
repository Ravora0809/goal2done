# Goal2Done — ONE STABLE BACKEND

This package is the baseline. Do not mix files from older Goal2Done ZIPs.

## Fixed

1. Google Drive -> dependent action IDs
   - `{{action_1.file_id}}` is resolved from `drive_search.files[0].id`.
2. Google Sheets create + populate
   - creates the real spreadsheet ID
   - writes values
   - reads them back
   - verifies the readback
3. Google Docs / Drive / Sheets / Calendar / Gmail tool dispatch remains wired
   through the existing executor.
4. Existing approval firewall is preserved.

## Install

```bash
pip install -r requirements.txt
playwright install chromium
```

Keep your existing:
- credentials.json
- token_gmail.json
- token_drive.json
- token_docs.json
- token_sheets.json
- token_calendar.json
- .env

## Start

```bash
uvicorn main:app --reload
```

## First test

```text
Create a Google Sheet called Expense Tracker with columns Date, Category, Amount and add three sample expenses.
```

Approve it.

Expected:
create -> real ID -> write -> readback -> verified.

## Second test

```text
Find my resume in Google Drive and summarize my technical skills.
```

Expected:
search -> real file ID -> read -> summarize.

Do not copy individual `tools.py`, `main.py`, `executor.py`, or `verifier.py`
from older ZIPs after installing this package.
