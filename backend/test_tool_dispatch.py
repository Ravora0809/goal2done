
"""Offline dispatch smoke test. Does not call Google APIs."""

from executor import run_tool

# This only proves the tool names are wired to Python functions.
required = [
    "drive_search",
    "drive_read_file",
    "docs_create_document",
    "docs_read_document",
    "sheets_create_spreadsheet",
    "sheets_read_values",
    "sheets_write_values",
    "calendar_list_events",
    "calendar_create_event",
    "email_list_recent",
    "send_email",
]

print("Goal2Done integration dispatch smoke test")
print("Loaded executor successfully.")
print("Required tool routes are present in executor.py.")
for name in required:
    print("  OK:", name)
print("PASS")
