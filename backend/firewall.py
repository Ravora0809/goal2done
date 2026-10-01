SAFE_TOOLS = {
    "search_web",
    "create_task",
    "browser_open",
    "calendar_list_events",
    "email_list_recent",
    "drive_list_files",
    "drive_search",
    "drive_read_file",
    "docs_read_document",
    "sheets_read_values",
}


APPROVAL_REQUIRED = {
    "docs_create_document",
    "docs_append_text",
    "sheets_create_spreadsheet",
    "sheets_write_values",
    "sheets_append_values",
    "sheets_clear_values",
    "create_reminder",
    "send_email",
    "submit_form",
    "purchase",
    "book_ticket",
    "delete_file",
    "update_reminder",
    "delete_reminder",
    "calendar_create_event",
    "calendar_update_event",
    "calendar_delete_event",
    "send_message",
    "browser_action",
}


def requires_approval(tool_name: str) -> bool:

    return tool_name in APPROVAL_REQUIRED