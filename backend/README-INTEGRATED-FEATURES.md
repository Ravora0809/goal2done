# Goal2Done - Integrated Features

This backend build adds the feature set discussed after Gmail:

- Gmail read/send
- Google Calendar read/create/update/delete
- Messaging (Telegram or macOS Messages)
- File/document discovery and reading
- PDF/DOCX/Markdown/TXT document generation
- Google Maps search and directions
- Browser update/cancel/submit actions with persistent Playwright profile
- Approval firewall for consequential actions
- Action verification for every new tool
- Shared LLM primary/fallback routing for planner, recovery and answer generation

## Install

```bash
pip install -r requirements-google-calendar.txt
playwright install chromium
```

Copy `.env.features.example` to `.env` and fill the credentials you actually use.

## Gmail re-authorization

Because Gmail now uses both `gmail.readonly` and `gmail.send`, delete the old `token_gmail.json` before the first run after this update and authorize again.

## Files

Create a workspace:

```bash
mkdir -p workspace generated
```

Only files under `GOAL2DONE_FILES_DIR` are exposed to the agent's file tools.

## Messaging

Telegram:

- Create a bot with BotFather.
- Set `TELEGRAM_BOT_TOKEN`.
- Pass the Telegram chat ID as `recipient`.

macOS Messages:

- Use `platform: "imessage"`.
- The Mac must allow the terminal/Python process to control Messages.

## Browser update/cancel

The browser tool uses a persistent Chromium profile at `GOAL2DONE_BROWSER_PROFILE`.
Authenticate that browser profile manually before asking Goal2Done to modify/cancel a site action.
Consequential browser actions always require approval.

## Maps

`maps_search` and `maps_directions` return Google Maps URLs without an API key.
If `GOOGLE_MAPS_API_KEY` is configured and the Routes API is enabled, directions can also return distance/duration.

## Example goals

```text
Find the latest email from my recruiter and summarize it.

Find my resume in my workspace and create a PDF interview checklist from it.

Send Rahul a Telegram message saying I will be 10 minutes late.

Find directions from VIT-AP to Vijayawada airport.

Open my booking page and cancel the reservation.

Find the interview email, add the interview to my calendar, and create a reminder one hour before it.
```

## Google Drive

Goal2Done can now read the authenticated user's Google Drive in read-only mode.

Tools:

- `drive_list_files` — list files/folders
- `drive_search` — search by filename/full text
- `drive_read_file` — read Google Docs and text-like files

Setup:

1. Enable **Google Drive API** in the same Google Cloud project used by Calendar/Gmail.
2. Add the Drive read-only OAuth scope to the OAuth consent configuration.
3. Keep the existing Desktop OAuth `credentials.json` in the backend directory.
4. Run the first Drive test; Google will ask you to authorize Drive access.
5. Goal2Done stores the resulting token separately as `token_drive.json`.

The current implementation intentionally uses `drive.readonly`. It can search/read existing Drive files but cannot edit or delete them.
