def verify_action(tool_name: str, result: dict):

    # --------------------------------
    # Approval required
    # --------------------------------
    if result.get("status") == "approval_required":
        return {
            "verified": False,
            "status": "awaiting_approval",
            "message": "Action is waiting for user approval."
        }

    # --------------------------------
    # General failure
    # --------------------------------
    if result.get("status") != "success":
        return {
            "verified": False,
            "status": "failed",
            "message": "Action failed during execution."
        }

    # --------------------------------
    # Verify web search
    # --------------------------------
    if tool_name == "search_web":

        results = result.get("results", [])

        if len(results) > 0:
            return {
                "verified": True,
                "status": "verified",
                "message": f"Search returned {len(results)} results."
            }

        return {
            "verified": False,
            "status": "failed",
            "message": "Search returned no results."
        }

    # --------------------------------
    # Verify task creation
    # --------------------------------
    if tool_name == "create_task":

        task = result.get("task")

        if task:
            return {
                "verified": True,
                "status": "verified",
                "message": f"Task '{task['title']}' was created."
            }

        return {
            "verified": False,
            "status": "failed",
            "message": "Task creation could not be verified."
        }

    # --------------------------------
    # Verify reminder creation
    # --------------------------------
    if tool_name == "create_reminder":

        reminder = result.get("reminder")

        if reminder:
            return {
                "verified": True,
                "status": "verified",
                "message": (
                    f"Reminder '{reminder['title']}' "
                    f"was created for {reminder['time']}."
                )
            }

        return {
            "verified": False,
            "status": "failed",
            "message": "Reminder creation could not be verified."
        }

    # --------------------------------
    # Verify browser navigation
    # --------------------------------
    if tool_name == "browser_open":

        if result.get("url"):
            return {
                "verified": True,
                "status": "verified",
                "message": f"Successfully opened {result['url']}."
            }

        return {
            "verified": False,
            "status": "failed",
            "message": "Browser navigation could not be verified."
        }

    # --------------------------------
    # Unknown tool
    # --------------------------------
    return {
        "verified": False,
        "status": "unknown",
        "message": "No verification method exists for this tool."
    }