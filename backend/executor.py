from firewall import requires_approval

from tools import (
    search_web,
    create_task,
    create_reminder,
    update_reminder,
    delete_reminder,
    browser_open,
    generate_answer,
    calendar_list_events_tool,
    calendar_create_event_tool,
    calendar_update_event_tool,
    calendar_delete_event_tool,
    send_email_tool,
    email_list_recent,
    send_message_tool,
    list_files_tool,
    search_files_tool,
    read_file_tool,
    generate_document_tool,
    maps_search_tool,
    maps_directions_tool,
    browser_action_tool,
    drive_list_files_tool,
    drive_search_tool,
    drive_read_file_tool,
    docs_create_document_tool,
    docs_read_document_tool,
    docs_append_text_tool,
    sheets_create_spreadsheet_tool,
    sheets_read_values_tool,
    sheets_write_values_tool,
    sheets_append_values_tool,
    sheets_clear_values_tool,
)


def run_tool(tool_name, arguments, user_id=None):

    arguments = dict(arguments or {})
    google_tools = {
        "calendar_list_events", "calendar_create_event", "calendar_update_event", "calendar_delete_event",
        "drive_list_files", "drive_search", "drive_read_file",
        "docs_create_document", "docs_read_document", "docs_append_text",
        "sheets_create_spreadsheet", "sheets_read_values", "sheets_write_values", "sheets_append_values", "sheets_clear_values",
        "send_email", "email_list_recent",
    }
    if tool_name in google_tools:
        if not user_id:
            return {"status": "error", "message": "No authenticated user was provided for Google integration."}
        arguments["user_id"] = user_id

    if tool_name == "search_web":
        return search_web(**arguments)

    if tool_name == "create_task":
        return create_task(**arguments)

    if tool_name == "create_reminder":
        return create_reminder(**arguments)

    if tool_name == "browser_open":
        return browser_open(**arguments)

    if tool_name == "drive_list_files":
        return drive_list_files_tool(**arguments)

    if tool_name == "drive_search":
        return drive_search_tool(**arguments)

    if tool_name == "drive_read_file":
        return drive_read_file_tool(**arguments)

    if tool_name == "generate_answer":
        return generate_answer(**arguments)

    if tool_name == "calendar_list_events":
        return calendar_list_events_tool(**arguments)

    if tool_name == "calendar_create_event":
        return calendar_create_event_tool(**arguments)

    if tool_name == "calendar_update_event":
        return calendar_update_event_tool(**arguments)

    if tool_name == "calendar_delete_event":
        return calendar_delete_event_tool(**arguments)

    if tool_name == "docs_create_document":
        return docs_create_document_tool(**arguments)
    if tool_name == "docs_read_document":
        return docs_read_document_tool(**arguments)
    if tool_name == "docs_append_text":
        return docs_append_text_tool(**arguments)
    if tool_name == "sheets_create_spreadsheet":
        return sheets_create_spreadsheet_tool(**arguments)
    if tool_name == "sheets_read_values":
        return sheets_read_values_tool(**arguments)
    if tool_name == "sheets_write_values":
        return sheets_write_values_tool(**arguments)
    if tool_name == "sheets_append_values":
        return sheets_append_values_tool(**arguments)
    if tool_name == "sheets_clear_values":
        return sheets_clear_values_tool(**arguments)

    if tool_name == "send_email":
        return send_email_tool(**arguments)

    if tool_name == "email_list_recent":
        return email_list_recent(**arguments)

    if tool_name == "send_message":
        return send_message_tool(**arguments)

    if tool_name == "list_files":
        return list_files_tool(**arguments)

    if tool_name == "search_files":
        return search_files_tool(**arguments)

    if tool_name == "read_file":
        return read_file_tool(**arguments)

    if tool_name == "generate_document":
        return generate_document_tool(**arguments)

    if tool_name == "maps_search":
        return maps_search_tool(**arguments)

    if tool_name == "maps_directions":
        return maps_directions_tool(**arguments)

    if tool_name == "browser_action":
        return browser_action_tool(**arguments)

    if tool_name == "update_reminder":
        return update_reminder(
        **arguments
    )
    if tool_name == "delete_reminder":
        return delete_reminder(
        **arguments
    )

    return {
        "status": "error",
        "message": f"Unknown tool: {tool_name}",
    }


def execute_tool(tool_name, arguments, user_id=None):

    if requires_approval(tool_name):

        return {
            "status": "approval_required",
            "risk": "medium",
            "message": (
                f"Goal2Done wants to execute {tool_name}"
            ),
            "tool": tool_name,
            "arguments": arguments,
        }

    return run_tool(
        tool_name,
        arguments,
        user_id=user_id,
    )