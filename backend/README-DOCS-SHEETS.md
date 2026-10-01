# Google Docs + Sheets

Goal2Done can read Google Docs/Sheets and, with approval, create or modify them.

## APIs

Enable **Google Docs API** and **Google Sheets API** in the same Google Cloud project used by Calendar/Gmail/Drive.

## OAuth scopes

This local hackathon build requests:
- `https://www.googleapis.com/auth/documents`
- `https://www.googleapis.com/auth/spreadsheets`

These are sensitive scopes. For a local/testing app, add your Google account as a test user on the OAuth consent screen.

## Tokens

The first Docs operation creates `token_docs.json`; the first Sheets operation creates `token_sheets.json`. Both reuse the same Desktop `credentials.json`.

## Direct tests

Run these one at a time:

```bash
python -c "from google_docs import docs_create_document; print(docs_create_document('Goal2Done Test Doc','Hello from Goal2Done'))"
python -c "from google_docs import docs_read_document; print(docs_read_document('YOUR_DOCUMENT_ID'))"
python -c "from google_sheets import sheets_create_spreadsheet; print(sheets_create_spreadsheet('Goal2Done Test Sheet'))"
python -c "from google_sheets import sheets_write_values; print(sheets_write_values('YOUR_SPREADSHEET_ID','Sheet1!A1:B2', [['Name','Score'],['Mounika',100]]))"
python -c "from google_sheets import sheets_read_values; print(sheets_read_values('YOUR_SPREADSHEET_ID','Sheet1!A1:B2'))"
```

Writes/creates are also exposed as planner tools and are protected by the approval firewall.
