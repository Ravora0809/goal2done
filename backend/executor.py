from firewall import requires_approval

from tools import (
    search_web,
    create_task,
    create_reminder,
    browser_open
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

    return {
        "status": "error",
        "message": f"Unknown tool: {tool_name}"
    }


def execute_tool(tool_name, arguments):

    # --------------------------------------------------------
    # Approval Firewall
    # --------------------------------------------------------

    if requires_approval(tool_name):

        return {
            "status": "approval_required",
            "risk": "medium",
            "message": f"Goal2Done wants to execute {tool_name}",
            "tool": tool_name,
            "arguments": arguments
        }

    # --------------------------------------------------------
    # Execute safe action
    # --------------------------------------------------------

    return run_tool(
        tool_name,
        arguments
    )