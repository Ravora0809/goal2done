SAFE_TOOLS = {
    "search_web",
    "create_task",
    "browser_open",
    "calendar_list_events",
}


APPROVAL_REQUIRED = {
    "create_reminder",
    "send_email",
    "send_message",
    "submit_form",
    "purchase",
    "book_ticket",
    "delete_file",
    "update_reminder",
    "delete_reminder",
    "calendar_create_event",
    "calendar_update_event",
    "calendar_delete_event",
}


def requires_approval(tool_name: str) -> bool:

    return tool_name in APPROVAL_REQUIRED