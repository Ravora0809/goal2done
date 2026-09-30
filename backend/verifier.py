# ==========================================
# GOAL2DONE ACTION VERIFIER
# ==========================================


def verify_action(tool_name: str, result: dict):

    # ==========================================
    # 1. APPROVAL
    # ==========================================

    if result.get("status") == "approval_required":

        return {
            "verified": False,
            "status": "awaiting_approval",
            "category": "APPROVAL",
            "message": "Action is waiting for user approval.",
        }

    # ==========================================
    # 2. GENERAL EXECUTION FAILURE
    # ==========================================

    if result.get("status") != "success":

        return {
            "verified": False,
            "status": "failed",
            "category": "EXECUTION",
            "message": result.get(
                "message",
                "Action failed during execution.",
            ),
        }

    # ==========================================
    # 3. RESEARCH
    # ==========================================

    if tool_name == "search_web":

        results = result.get(
            "results",
            [],
        )

        if not isinstance(results, list):

            return {
                "verified": False,
                "status": "failed",
                "category": "RESEARCH",
                "message": "Search returned invalid results.",
            }

        if len(results) == 0:

            return {
                "verified": False,
                "status": "failed",
                "category": "RESEARCH",
                "message": "Search returned no results.",
            }

        return {
            "verified": True,
            "status": "verified",
            "category": "RESEARCH",
            "message": (
                f"Search returned {len(results)} results."
            ),
        }

    # ==========================================
    # 4. ANSWER GENERATION
    # ==========================================

    if tool_name == "generate_answer":

        answer = result.get("answer")

        # Answer must actually exist
        if not answer:

            return {
                "verified": False,
                "status": "failed",
                "category": "ANSWER",
                "message": "No answer was generated.",
            }

        # Make sure it is text
        if not isinstance(answer, str):

            return {
                "verified": False,
                "status": "failed",
                "category": "ANSWER",
                "message": "Generated answer has an invalid format.",
            }

        # Remove whitespace
        answer = answer.strip()

        # Empty answer
        if len(answer) == 0:

            return {
                "verified": False,
                "status": "failed",
                "category": "ANSWER",
                "message": "Generated answer is empty.",
            }

        # Very tiny output is usually not a useful answer
        if len(answer) < 10:

            return {
                "verified": False,
                "status": "failed",
                "category": "ANSWER",
                "message": "Generated answer is too short.",
            }

        return {
            "verified": True,
            "status": "verified",
            "category": "ANSWER",
            "message": "Answer was generated successfully.",
        }

    # ==========================================
    # 5. TASK CREATION
    # ==========================================

    if tool_name == "create_task":

        task = result.get("task")

        if not task:

            return {
                "verified": False,
                "status": "failed",
                "category": "TASK",
                "message": "Task creation could not be verified.",
            }

        if not task.get("id"):

            return {
                "verified": False,
                "status": "failed",
                "category": "TASK",
                "message": "Created task has no ID.",
            }

        if not task.get("title"):

            return {
                "verified": False,
                "status": "failed",
                "category": "TASK",
                "message": "Created task has no title.",
            }

        return {
            "verified": True,
            "status": "verified",
            "category": "TASK",
            "message": (
                f"Task '{task['title']}' was created."
            ),
        }

    # ==========================================
    # 6. REMINDER CREATION
    # ==========================================

    if tool_name == "create_reminder":

        reminder = result.get("reminder")

        if not reminder:

            return {
                "verified": False,
                "status": "failed",
                "category": "REMINDER",
                "message": (
                    "Reminder creation could not be verified."
                ),
            }

        if not reminder.get("id"):

            return {
                "verified": False,
                "status": "failed",
                "category": "REMINDER",
                "message": "Created reminder has no ID.",
            }

        if not reminder.get("title"):

            return {
                "verified": False,
                "status": "failed",
                "category": "REMINDER",
                "message": "Created reminder has no title.",
            }

        if not reminder.get("remind_at"):

            return {
                "verified": False,
                "status": "failed",
                "category": "REMINDER",
                "message": "Reminder has no scheduled time.",
            }

        return {
            "verified": True,
            "status": "verified",
            "category": "REMINDER",
            "message": (
                f"Reminder '{reminder['title']}' "
                f"was created for {reminder.get('time', reminder['remind_at'])}."
            ),
        }

    # ==========================================
    # 7. BROWSER
    # ==========================================

    if tool_name == "browser_open":

        url = result.get("url")

        if not url:

            return {
                "verified": False,
                "status": "failed",
                "category": "BROWSER",
                "message": (
                    "Browser navigation could not be verified."
                ),
            }

        return {
            "verified": True,
            "status": "verified",
            "category": "BROWSER",
            "message": (
                f"Successfully opened {url}."
            ),
        }

    # ==========================================
    # 8. UNKNOWN TOOL
    # ==========================================

    return {
        "verified": False,
        "status": "unknown",
        "category": "UNKNOWN",
        "message": (
            f"No verification method exists for tool '{tool_name}'."
        ),
    }