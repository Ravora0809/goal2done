SAFE_TOOLS = {
    "search_web",
    "create_task",
    "browser_open"
}


APPROVAL_REQUIRED = {
    "create_reminder",
    "send_email",
    "send_message",
    "submit_form",
    "purchase",
    "book_ticket",
    "delete_file"
}


def requires_approval(tool_name: str) -> bool:

    return tool_name in APPROVAL_REQUIRED