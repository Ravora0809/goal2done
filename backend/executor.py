from firewall import requires_approval

from tools import (
    search_web,
    create_task,
    create_reminder,
    update_reminder,
    delete_reminder,
    browser_open,
    generate_answer,
    calendar_list_events,
    calendar_create_event,
    calendar_update_event,
    calendar_delete_event,
)


def run_tool(tool_name, arguments):

    if tool_name == "search_web":
        return search_web(**arguments)

    if tool_name == "create_task":
        return create_task(**arguments)

    if tool_name == "create_reminder":
        return create_reminder(**arguments)

    if tool_name == "browser_open":
        return browser_open(**arguments)

    if tool_name == "generate_answer":
        return generate_answer(**arguments)

    if tool_name == "calendar_list_events":
        return calendar_list_events(**arguments)

    if tool_name == "calendar_create_event":
        return calendar_create_event(**arguments)

    if tool_name == "calendar_update_event":
        return calendar_update_event(**arguments)

    if tool_name == "calendar_delete_event":
        return calendar_delete_event(**arguments)
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


def execute_tool(tool_name, arguments):

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
    )