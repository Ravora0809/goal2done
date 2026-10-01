# ==========================================================
# GOAL2DONE - VERIFIER
# ==========================================================

def verify_action(tool_name, result):

    if not result:
        return {
            "verified": False,
            "status": "failed",
            "category": "UNKNOWN",
            "message": "Tool returned no result."
        }

    status = result.get("status")

    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    if tool_name == "search_web":

        if status == "success":

            results = result.get("results", [])

            if len(results) > 0:

                return {
                    "verified": True,
                    "status": "verified",
                    "category": "RESEARCH",
                    "message": (
                        f"Research completed with "
                        f"{len(results)} results."
                    )
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "RESEARCH",
            "message": "Web research returned no usable results."
        }

    # ------------------------------------------------------
    # BROWSER
    # ------------------------------------------------------

    if tool_name == "browser_open":

        if status == "success":

            return {
                "verified": True,
                "status": "verified",
                "category": "BROWSER",
                "message": "Web page opened successfully."
            }

        return {
            "verified": False,
            "status": "failed",
            "category": "BROWSER",
            "message": "Browser action failed."
        }

    # ------------------------------------------------------
    # TASK
    # ------------------------------------------------------

    if tool_name == "create_task":

        if status == "success":

            task = result.get("task")

            if task:

                return {
                    "verified": True,
                    "status": "verified",
                    "category": "TASK",
                    "message": (
                        f"Task '{task.get('title')}' "
                        "was created."
                    )
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "TASK",
            "message": "Task creation failed."
        }

    # ------------------------------------------------------
    # REMINDER
    # ------------------------------------------------------

    if tool_name == "create_reminder":

        if status == "success":

            reminder = result.get("reminder")

            if reminder:

                return {
                    "verified": True,
                    "status": "verified",
                    "category": "REMINDER",
                    "message": (
                        f"Reminder "
                        f"'{reminder.get('title')}' "
                        f"was created for "
                        f"{reminder.get('time')}."
                    )
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "REMINDER",
            "message": "Reminder creation failed."
        }

    # ------------------------------------------------------
    # ANSWER GENERATION
    # ------------------------------------------------------

    if tool_name == "generate_answer":

        if status == "success":

            answer = result.get("answer")

            if answer and str(answer).strip():

                return {
                    "verified": True,
                    "status": "verified",
                    "category": "ANSWER",
                    "message": "Final answer was generated."
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "ANSWER",
            "message": "No usable final answer was generated."
        }

    # ------------------------------------------------------
    # GOOGLE CALENDAR - LIST
    # ------------------------------------------------------

    if tool_name == "calendar_list_events":

        if status == "success":

            events = result.get("events", [])

            if isinstance(events, list):
                return {
                    "verified": True,
                    "status": "verified",
                    "category": "CALENDAR",
                    "message": (
                        f"Calendar read successfully with {len(events)} event(s)."
                    ),
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "CALENDAR",
            "message": result.get(
                "message",
                "Calendar events could not be read.",
            ),
        }

    # ------------------------------------------------------
    # GOOGLE CALENDAR - CREATE / UPDATE
    # ------------------------------------------------------

    if tool_name in {"calendar_create_event", "calendar_update_event"}:

        if status == "success":

            event = result.get("event")

            if isinstance(event, dict) and event.get("id"):
                return {
                    "verified": True,
                    "status": "verified",
                    "category": "CALENDAR",
                    "message": (
                        f"Calendar event '{event.get('title', 'Untitled event')}' "
                        "was saved successfully."
                    ),
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "CALENDAR",
            "message": result.get(
                "message",
                "Calendar event could not be saved.",
            ),
        }

    # ------------------------------------------------------
    # GOOGLE CALENDAR - DELETE
    # ------------------------------------------------------

    if tool_name == "calendar_delete_event":

        if status == "success" and result.get("event_id"):
            return {
                "verified": True,
                "status": "verified",
                "category": "CALENDAR",
                "message": "Calendar event was deleted successfully.",
            }

        return {
            "verified": False,
            "status": "failed",
            "category": "CALENDAR",
            "message": result.get(
                "message",
                "Calendar event could not be deleted.",
            ),
        }

    # ------------------------------------------------------
    # UNKNOWN TOOL
    # ------------------------------------------------------

    return {
        "verified": False,
        "status": "failed",
        "category": "UNKNOWN",
        "message": (
            f"No verifier exists for tool '{tool_name}'."
        )
    }


# ==========================================================
# GOAL-LEVEL VERIFICATION
# ==========================================================

def verify_goal(
    goal: str,
    executions: list,
):

    if not executions:

        return {
            "verified": False,
            "status": "failed",
            "message": "No actions were executed.",
            "completed_actions": 0,
            "failed_actions": 0,
            "pending_actions": 0,
        }

    completed = [
        execution
        for execution in executions
        if execution.get("status") == "completed"
    ]

    failed = [
        execution
        for execution in executions
        if execution.get("status")
        in ("failed", "rejected")
    ]

    pending = [
        execution
        for execution in executions
        if execution.get("status")
        in (
            "pending",
            "pending_approval",
            "in_progress",
        )
    ]

    # ------------------------------------------------------
    # FAILED ACTIONS
    # ------------------------------------------------------

    if failed:

        return {
            "verified": False,
            "status": "failed",
            "message": (
                "The goal cannot be verified because "
                "one or more actions failed."
            ),
            "completed_actions": len(completed),
            "failed_actions": len(failed),
            "pending_actions": len(pending),
        }

    # ------------------------------------------------------
    # PENDING ACTIONS
    # ------------------------------------------------------

    if pending:

        return {
            "verified": False,
            "status": "pending",
            "message": (
                "The goal cannot be verified yet because "
                "some actions are still pending."
            ),
            "completed_actions": len(completed),
            "failed_actions": 0,
            "pending_actions": len(pending),
        }

    # ------------------------------------------------------
    # ALL ACTIONS COMPLETED
    # ------------------------------------------------------

    if len(completed) == len(executions):

        return {
            "verified": True,
            "status": "verified",
            "message": (
                "All planned actions completed "
                "successfully."
            ),
            "completed_actions": len(completed),
            "failed_actions": 0,
            "pending_actions": 0,
        }

    return {
        "verified": False,
        "status": "unknown",
        "message": "Goal verification could not be determined.",
        "completed_actions": len(completed),
        "failed_actions": len(failed),
        "pending_actions": len(pending),
    }