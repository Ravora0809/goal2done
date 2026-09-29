SAFE_TOOLS = {
    "search_web",
    "create_task",
    "browser_open"
}

APPROVAL_REQUIRED = {
    "create_reminder"
}


def requires_approval(tool_name: str) -> bool:
    return tool_name in APPROVAL_REQUIRED