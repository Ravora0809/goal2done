# Goal2Done Frontend v4

## Calendar + Chat upgrade

This version keeps the persistent ChatGPT-style workspace and adds a real calendar view connected to the Google Calendar backend.

### Calendar behavior
- Monthly calendar grid.
- Days with Google Calendar events show an indigo dot.
- Days with Goal2Done reminders show a violet dot.
- Clicking a date shows only that date's events/reminders.
- Clicking an upcoming item jumps to its date.
- Google Calendar events show title, time, location, description, and an "Open in Google Calendar" link when available.
- Refresh button re-syncs the current month from the backend.
- Month navigation and "Jump to today" are included.
- Light/dark theme and responsive layout are preserved.

### Backend endpoint required
The frontend calls:

`GET /calendar/events?start_time=<ISO>&end_time=<ISO>&max_results=100`

The backend returns:

```json
{
  "status": "success",
  "type": "calendar_events",
  "events": [],
  "count": 0
}
```

### Important
Plain `create_task` items in the current backend do not contain a date, so they cannot be placed on a calendar day yet. Calendar display currently maps dated Google Calendar events and dated Goal2Done reminders. If dated tasks are needed later, add a `due_at` field to the task tool/database and expose it through a task endpoint.
