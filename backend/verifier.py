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
    # GOOGLE DRIVE - LIST / SEARCH
    # ------------------------------------------------------

    if tool_name in {"drive_list_files", "drive_search"}:

        if status == "success":

            files = result.get("files", [])

            if isinstance(files, list):
                return {
                    "verified": True,
                    "status": "verified",
                    "category": "DRIVE",
                    "message": (
                        f"Google Drive returned {len(files)} file(s)."
                    ),
                }

        return {
            "verified": False,
            "status": "failed",
            "category": "DRIVE",
            "message": result.get(
                "message",
                "Google Drive files could not be retrieved.",
            ),
        }

    # ------------------------------------------------------
    # GOOGLE DRIVE - READ
    # ------------------------------------------------------

    if tool_name == "drive_read_file":

        if status == "success" and result.get("file"):

            return {
                "verified": True,
                "status": "verified",
                "category": "DRIVE",
                "message": (
                    f"Google Drive file '{result['file'].get('name', 'file')}' "
                    "was read successfully."
                ),
            }

        return {
            "verified": False,
            "status": "failed",
            "category": "DRIVE",
            "message": result.get(
                "message",
                "Google Drive file could not be read.",
            ),
        }

    # ------------------------------------------------------
    # GOOGLE DOCS
    # ------------------------------------------------------

    if tool_name in {"docs_create_document", "docs_append_text"}:
        if status == "success":
            return {"verified": True, "status": "verified", "category": "DOCS",
                    "message": "Google Docs operation completed successfully."}
        return {"verified": False, "status": "failed", "category": "DOCS",
                "message": result.get("message", "Google Docs operation failed.")}

    if tool_name == "docs_read_document":
        if status == "success" and result.get("document") is not None:
            return {"verified": True, "status": "verified", "category": "DOCS",
                    "message": "Google Doc was read successfully."}
        return {"verified": False, "status": "failed", "category": "DOCS",
                "message": result.get("message", "Google Doc could not be read.")}

    # ------------------------------------------------------
    # GOOGLE SHEETS
    # ------------------------------------------------------

    if tool_name == "sheets_create_spreadsheet":
        if status != "success":
            return {
                "verified": False,
                "status": "failed",
                "category": "SHEETS",
                "message": result.get(
                    "message",
                    "Google Sheets creation failed.",
                ),
            }

        sheet = result.get("spreadsheet", {})
        spreadsheet_id = sheet.get("id")

        if not spreadsheet_id:
            return {
                "verified": False,
                "status": "failed",
                "category": "SHEETS",
                "message": "Google Sheet was created without a spreadsheet ID.",
            }

        # If the action also inserted values, require successful readback.
        if "values" in result or "write" in result:
            if result.get("readback_verified") is not True:
                return {
                    "verified": False,
                    "status": "failed",
                    "category": "SHEETS",
                    "message": (
                        "Google Sheet was created, but the inserted values "
                        "could not be verified by reading the sheet back."
                    ),
                }

        return {
            "verified": True,
            "status": "verified",
            "category": "SHEETS",
            "message": "Google Sheet was created and verified successfully.",
        }

    if tool_name in {
        "sheets_write_values",
        "sheets_append_values",
        "sheets_clear_values",
    }:
        if status == "success":
            return {
                "verified": True,
                "status": "verified",
                "category": "SHEETS",
                "message": "Google Sheets operation completed successfully.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "SHEETS",
            "message": result.get(
                "message",
                "Google Sheets operation failed.",
            ),
        }

    if tool_name == "sheets_read_values":
        if status == "success" and isinstance(result.get("values", []), list):
            return {"verified": True, "status": "verified", "category": "SHEETS",
                    "message": "Google Sheet values were read successfully."}
        return {"verified": False, "status": "failed", "category": "SHEETS",
                "message": result.get("message", "Google Sheet values could not be read.")}

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
    # GMAIL - SEND
    # ------------------------------------------------------

    if tool_name == "send_email":

        if status == "success" and result.get("message_id"):
            return {
                "verified": True,
                "status": "verified",
                "category": "EMAIL",
                "message": "Email was sent successfully.",
            }

        return {
            "verified": False,
            "status": "failed",
            "category": "EMAIL",
            "message": result.get(
                "message",
                "Email could not be sent.",
            ),
        }

    # ------------------------------------------------------
    # GMAIL - LIST
    # ------------------------------------------------------

    if tool_name == "email_list_recent":

        if status == "success" and isinstance(result.get("emails", []), list):
            return {
                "verified": True,
                "status": "verified",
                "category": "EMAIL",
                "message": (
                    f"Gmail read successfully with {len(result.get('emails', []))} message(s)."
                ),
            }

        return {
            "verified": False,
            "status": "failed",
            "category": "EMAIL",
            "message": result.get(
                "message",
                "Emails could not be read.",
            ),
        }

    # ------------------------------------------------------
    # MESSAGING
    # ------------------------------------------------------

    if tool_name == "send_message":
        if status == "success":
            return {
                "verified": True,
                "status": "verified",
                "category": "MESSAGING",
                "message": "Message was sent successfully.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "MESSAGING",
            "message": result.get("message", "Message could not be sent."),
        }

    # ------------------------------------------------------
    # FILES
    # ------------------------------------------------------

    if tool_name in {"list_files", "search_files", "read_file"}:
        if status == "success":
            return {
                "verified": True,
                "status": "verified",
                "category": "FILES",
                "message": "File operation completed successfully.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "FILES",
            "message": result.get("message", "File operation failed."),
        }

    # ------------------------------------------------------
    # DOCUMENT GENERATION
    # ------------------------------------------------------

    if tool_name == "generate_document":
        if status == "success" and result.get("path"):
            return {
                "verified": True,
                "status": "verified",
                "category": "DOCUMENT",
                "message": f"Document generated at {result.get('filename', result.get('path'))}.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "DOCUMENT",
            "message": result.get("message", "Document generation failed."),
        }

    # ------------------------------------------------------
    # MAPS / TRAVEL
    # ------------------------------------------------------

    if tool_name in {"maps_search", "maps_directions"}:
        if status == "success" and result.get("url"):
            return {
                "verified": True,
                "status": "verified",
                "category": "MAPS",
                "message": "Maps/travel result generated successfully.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "MAPS",
            "message": result.get("message", "Maps request failed."),
        }

    # ------------------------------------------------------
    # BROWSER ACTION
    # ------------------------------------------------------

    if tool_name == "browser_action":
        if status == "success":
            return {
                "verified": True,
                "status": "verified",
                "category": "BROWSER",
                "message": "Browser action completed successfully.",
            }
        return {
            "verified": False,
            "status": "failed",
            "category": "BROWSER",
            "message": result.get("message", "Browser action failed."),
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