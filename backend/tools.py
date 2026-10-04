# ============================================================
# WEB SEARCH
# ============================================================
import os
import json
from ddgs import DDGS
from datetime import datetime, timezone
import dateparser
 
from database import (
    create_reminder_record,
    get_reminder,
    update_reminder_record,
    delete_reminder_record,
    find_reminder_by_title,
)
tasks = []
reminders = []


def search_web(query: str):

    try:

        results = DDGS().text(
            query,
            max_results=5
        )

        formatted_results = []

        for result in results:

            formatted_results.append({
                "title": result.get("title"),
                "url": result.get("href"),
                "content": result.get("body")
            })

        return {
            "status": "success",
            "type": "research",
            "query": query,
            "results": formatted_results
        }

    except Exception as e:

        return {
            "status": "error",
            "type": "research",
            "query": query,
            "message": str(e)
        }


# ============================================================
# CREATE TASK
# ============================================================

def create_task(title: str):

    task = {
        "id": len(tasks) + 1,
        "title": title,
        "completed": False
    }

    tasks.append(task)

    return {
        "status": "success",
        "type": "task",
        "task": task
    }


# ============================================================
# CREATE REMINDER
# ============================================================

def create_reminder(title: str, time: str, user_id: str | None = None):
    try:
        parsed_time = dateparser.parse(
            time,
            settings={
                "PREFER_DATES_FROM": "future",
                "RETURN_AS_TIMEZONE_AWARE": True
            }
        )

        if not parsed_time:
            return {
                "status": "error",
                "type": "reminder",
                "message": f"Could not understand reminder time: {time}"
            }

        # Convert to UTC for consistent storage
        if parsed_time.tzinfo is None:
            parsed_time = parsed_time.replace(
                tzinfo=datetime.now().astimezone().tzinfo
            )

        parsed_time = parsed_time.astimezone(timezone.utc)

        remind_at = parsed_time.isoformat()

        reminder = create_reminder_record(
            title=title,
            remind_at=remind_at,
            user_id=user_id
        )

        return {
            "status": "success",
            "type": "reminder",
            "reminder": {
                "id": reminder["id"],
                "title": reminder["title"],
                "time": time,
                "remind_at": reminder["remind_at"],
                "status": reminder["status"]
            }
        }

    except Exception as e:
        return {
            "status": "error",
            "type": "reminder",
            "message": str(e)
        }

# ============================================================
# BROWSER
# ============================================================

from browser import open_browser
from google_calendar import (
    calendar_list_events,
    calendar_create_event,
    calendar_update_event,
    calendar_delete_event,
)
from google_drive import (
    drive_list_files,
    drive_search,
    drive_read_file,
)
from google_docs import docs_create_document, docs_read_document, docs_append_text
from google_sheets import sheets_create_spreadsheet, sheets_read_values, sheets_write_values, sheets_append_values, sheets_clear_values
from gmail import send_email, list_recent_emails
from messaging import send_message
from file_tools import list_files, search_files, read_file
from document_tools import generate_document
from maps_travel import maps_search, maps_directions
from browser_actions import browser_action
from llm_client import chat_completion


def browser_open(url: str):

    return open_browser(url)


# ============================================================
# GOOGLE CALENDAR
# ============================================================

def calendar_list_events_tool(start_time=None, end_time=None, max_results=20, user_id=None):
    return calendar_list_events(start_time=start_time, end_time=end_time, max_results=max_results, user_id=user_id)


def calendar_create_event_tool(title, start_time, end_time=None, description="", location="", attendees=None, user_id=None):
    return calendar_create_event(title=title, start_time=start_time, end_time=end_time, description=description, location=location, attendees=attendees, user_id=user_id)


def calendar_update_event_tool(event_id, title=None, start_time=None, end_time=None, description=None, location=None, user_id=None):
    return calendar_update_event(event_id=event_id, title=title, start_time=start_time, end_time=end_time, description=description, location=location, user_id=user_id)


def calendar_delete_event_tool(event_id, user_id=None):
    return calendar_delete_event(event_id=event_id, user_id=user_id)


# ============================================================
# GOOGLE DRIVE
# ============================================================

def drive_list_files_tool(folder_id=None, max_results=8, user_id=None):
    # Keep Drive listing small to reduce Google API traffic and LLM context.
    max_results = min(int(max_results or 8), 8)
    return drive_list_files(
        folder_id=folder_id,
        max_results=max_results,
        user_id=user_id,
    )


def drive_search_tool(query, max_results=8, user_id=None):
    # Search only the most relevant files; avoid large result sets.
    max_results = min(int(max_results or 8), 8)
    return drive_search(
        query=query,
        max_results=max_results,
        user_id=user_id,
    )


def drive_read_file_tool(file_id, max_chars=6500, user_id=None):
    # Never send an entire large Drive document into the LLM.
    max_chars = min(int(max_chars or 6500), 6500)
    return drive_read_file(
        file_id=file_id,
        max_chars=max_chars,
        user_id=user_id,
    )
# ============================================================
# GOOGLE DOCS
# ============================================================

def docs_create_document_tool(title, content="", user_id=None):
    return docs_create_document(title=title, content=content, user_id=user_id)


def docs_read_document_tool(document_id, max_chars=6500, user_id=None):
    # Bound Google Docs content before it reaches the model.
    max_chars = min(int(max_chars or 6500), 6500)
    return docs_read_document(document_id=document_id, max_chars=max_chars, user_id=user_id)


def docs_append_text_tool(document_id, content, user_id=None):
    return docs_append_text(document_id=document_id, content=content, user_id=user_id)


# ============================================================
# GOOGLE SHEETS
# ============================================================

def sheets_create_spreadsheet_tool(
    title,
    values=None,
    range_name="Sheet1!A1",
    input_option="USER_ENTERED",
    user_id=None,
):
    """Create a Sheet and optionally populate + read it back."""
    created = sheets_create_spreadsheet(title=title, user_id=user_id)

    if created.get("status") != "success":
        return created

    sheet = created.get("spreadsheet", {})
    spreadsheet_id = sheet.get("id")

    if not spreadsheet_id:
        return {
            **created,
            "status": "error",
            "message": "Spreadsheet was created but no spreadsheet ID was returned.",
        }

    if values is None:
        return created

    write_result = sheets_write_values(
        spreadsheet_id=spreadsheet_id,
        range_name=range_name,
        values=values,
        input_option=input_option,
        user_id=user_id,
    )

    if write_result.get("status") != "success":
        return {
            **created,
            "status": "error",
            "message": write_result.get(
                "message",
                "Spreadsheet was created, but writing the data failed.",
            ),
            "write": write_result,
        }

    readback = sheets_read_values(
        spreadsheet_id=spreadsheet_id,
        range_name=range_name,
        user_id=user_id,
    )

    readback_values = (
        readback.get("values", [])
        if readback.get("status") == "success"
        else []
    )

    # Google Sheets may normalize values. Compare string representations
    # row-by-row for a stable verification result.
    def norm(rows):
        return [[str(v) for v in row] for row in (rows or [])]

    readback_verified = norm(readback_values) == norm(values)

    return {
        **created,
        "write": write_result,
        "readback": readback,
        "readback_verified": readback_verified,
    }


def sheets_read_values_tool(spreadsheet_id, range_name, user_id=None):
    return sheets_read_values(spreadsheet_id=spreadsheet_id, range_name=range_name, user_id=user_id)


def sheets_write_values_tool(
    spreadsheet_id,
    range_name,
    values,
    input_option="USER_ENTERED",
    user_id=None,
):
    if isinstance(spreadsheet_id, str) and (
        "{{" in spreadsheet_id or "}}" in spreadsheet_id
    ):
        return {
            "status": "error",
            "type": "google_sheet_update",
            "message": (
                "Unresolved spreadsheet_id placeholder received. "
                "Create the spreadsheet first and use its real ID."
            ),
        }

    return sheets_write_values(
        spreadsheet_id=spreadsheet_id,
        range_name=range_name,
        values=values,
        input_option=input_option,
        user_id=user_id,
    )


def sheets_append_values_tool(spreadsheet_id, range_name, values, input_option="USER_ENTERED", user_id=None):
    return sheets_append_values(spreadsheet_id=spreadsheet_id, range_name=range_name, values=values, input_option=input_option, user_id=user_id)


def sheets_clear_values_tool(spreadsheet_id, range_name, user_id=None):
    return sheets_clear_values(spreadsheet_id=spreadsheet_id, range_name=range_name, user_id=user_id)


# ============================================================
# GMAIL
# ============================================================

def send_email_tool(
    to,
    subject,
    body,
    cc=None,
    bcc=None,
    user_id=None,
):
    return send_email(
        to=to,
        subject=subject,
        body=body,
        cc=cc,
        bcc=bcc,
        user_id=user_id,
    )


def email_list_recent(max_results=5, user_id=None):
    # Gmail analysis is intentionally capped to reduce API calls and tokens.
    max_results = min(int(max_results or 5), 5)
    return list_recent_emails(max_results=max_results, user_id=user_id)


# ============================================================
# MESSAGING
# ============================================================

def send_message_tool(platform, recipient, message):
    return send_message(platform=platform, recipient=recipient, message=message)


# ============================================================
# FILES / DOCUMENTS
# ============================================================

def list_files_tool(directory=".", max_results=50):
    return list_files(directory=directory, max_results=max_results)


def search_files_tool(query, directory=".", max_results=20):
    return search_files(query=query, directory=directory, max_results=max_results)


def read_file_tool(path, max_chars=50000):
    return read_file(path=path, max_chars=max_chars)


def generate_document_tool(format, title, content, filename=""):
    return generate_document(format=format, title=title, content=content, filename=filename)


# ============================================================
# MAPS / TRAVEL
# ============================================================

def maps_search_tool(query):
    return maps_search(query=query)


def maps_directions_tool(origin, destination, mode="driving"):
    return maps_directions(origin=origin, destination=destination, mode=mode)


# ============================================================
# BROWSER ACTIONS
# ============================================================

def browser_action_tool(url, action, target_text="", value="", confirm_text=""):
    return browser_action(
        url=url,
        action=action,
        target_text=target_text,
        value=value,
        confirm_text=confirm_text,
    )


# ============================================================
# GENERATE ANSWER
# ============================================================
def generate_answer(instruction: str, context: dict, task: str = "answer"):
    """Generate the final response using a task-specific LLM route.

    task can be: answer, gmail, docs, drive, fast, recovery, etc.
    When omitted, infer the route from the previous tool results.
    """

    try:
        goal = context.get("goal", "")
        previous_results = context.get("results", [])

        # --------------------------------------------------
        # Infer the best analysis model when the planner did
        # not explicitly provide a task.
        # --------------------------------------------------
        if not task or task == "answer":
            tool_names = {
                str(item.get("tool", ""))
                for item in previous_results
                if isinstance(item, dict)
            }

            if "email_list_recent" in tool_names:
                task = "gmail"
            elif any(name.startswith("drive_") for name in tool_names):
                task = "drive"
            elif any(name.startswith("docs_") for name in tool_names):
                task = "docs"
            else:
                task = "answer"

        # --------------------------------------------------
        # Compact connected-app results aggressively.
        # Never send huge Gmail/Drive/Docs payloads to the LLM.
        # --------------------------------------------------
        compact_results = []

        for item in previous_results[-8:]:
            if not isinstance(item, dict):
                continue

            tool_name = item.get("tool", "")
            result = item.get("result", item)

            if isinstance(result, dict):
                result = dict(result)

                for key in ("content", "text", "message"):
                    value = result.get(key)
                    if isinstance(value, str):
                        result[key] = value[:6500]

                if isinstance(result.get("emails"), list):
                    result["emails"] = result["emails"][:5]

                if isinstance(result.get("results"), list):
                    result["results"] = result["results"][:8]

                if isinstance(result.get("files"), list):
                    result["files"] = result["files"][:8]

                compact_results.append({
                    "tool": tool_name,
                    "result": result,
                })

            elif isinstance(result, str):
                compact_results.append({
                    "tool": tool_name,
                    "result": result[:6500],
                })

        research_data = json.dumps(
            compact_results,
            ensure_ascii=False,
            separators=(",", ":"),
        )

        prompt = f"""
You are the final answer generator for Goal2Done.

USER GOAL:
{goal}

USER REQUEST:
{instruction}

INFORMATION FROM PREVIOUS ACTIONS:
{research_data}

Create the final response shown directly to the user.

Rules:
1. Answer the user's actual request directly.
2. Use the supplied action results; do not invent facts.
3. Do not dump raw API responses or entire emails/documents.
4. Do not mention internal tools, models, planners, APIs, or execution.
5. Use concise Markdown.
6. Prefer short paragraphs and bullets.
7. Keep simple answers around 50-150 words.
8. Keep normal research answers around 100-300 words.
9. If the user asks for a summary, give the important findings first.
10. Do not repeat the question.

Return ONLY the final user-facing answer.
"""

        # Per-task output budgets. The router itself also enforces a hard cap.
        token_env = {
            "planner": "PLANNER_MAX_TOKENS",
            "answer": "ANSWER_MAX_TOKENS",
            "gmail": "GMAIL_MAX_TOKENS",
            "docs": "DOCS_MAX_TOKENS",
            "drive": "DRIVE_MAX_TOKENS",
            "fast": "FAST_MAX_TOKENS",
            "tool": "TOOL_MAX_TOKENS",
            "safety": "SAFETY_MAX_TOKENS",
            "recovery": "RECOVERY_MAX_TOKENS",
        }
        default_tokens = {
            "answer": 900,
            "gmail": 900,
            "docs": 1200,
            "drive": 900,
        }
        env_name = token_env.get(task, "ANSWER_MAX_TOKENS")
        max_tokens = int(os.getenv(env_name, str(default_tokens.get(task, 900))))

        response, used_model = chat_completion(
            task=task,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful final-answer generator. "
                        "Return only the answer requested by the user."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            temperature=0.2,
            max_tokens=max_tokens,
        )

        answer = response.choices[0].message.content

        return {
            "status": "success",
            "type": "answer",
            "answer": answer,
            "model": used_model,
            "task": task,
        }

    except Exception as e:
        return {
            "status": "error",
            "type": "answer",
            "message": str(e),
        }



# ==========================================================
# UPDATE REMINDER
# ==========================================================

def update_reminder(
    reminder_id=None,
    title=None,
    time=None,
    user_id=None,
):

    try:

        if not reminder_id and not title:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    "A reminder ID or title "
                    "is required."
                ),
            }


        # --------------------------------------------------
        # Find by title when AI does not know the ID
        # --------------------------------------------------

        if not reminder_id:

            matches = find_reminder_by_title(
                    title,
                    user_id=user_id
                )


            if len(matches) == 0:

                return {
                    "status": "error",
                    "type": "reminder",
                    "message": (
                        f"No active reminder "
                        f"matching '{title}' "
                        f"was found."
                    ),
                }


            if len(matches) > 1:

                return {
                    "status": "error",
                    "type": "reminder",
                    "message": (
                        "Multiple reminders "
                        "matched. Please provide "
                        "a more specific reminder."
                    ),
                    "matches": matches,
                }


            reminder_id =matches[0]["id"]


        # --------------------------------------------------
        # Require new time
        # --------------------------------------------------

        if not time:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    "A new reminder time "
                    "is required."
                ),
            }


        parsed_time = dateparser.parse(
            time,
            settings={
                "PREFER_DATES_FROM":
                    "future",
                "RETURN_AS_TIMEZONE_AWARE":
                    True,
            },
        )


        if not parsed_time:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    f"Could not understand "
                    f"reminder time: {time}"
                ),
            }


        if parsed_time.tzinfo is None:

            parsed_time =parsed_time.replace(
                    tzinfo=
                        datetime.now()
                        .astimezone()
                        .tzinfo
                )


        parsed_time =parsed_time.astimezone(
                timezone.utc
            )


        remind_at =parsed_time.isoformat()


        # --------------------------------------------------
        # Preserve old title if title not supplied
        # --------------------------------------------------

        if not title:
            existing = get_reminder(reminder_id)
            if existing:
                title = existing["title"]


        updated = update_reminder_record(
                reminder_id=reminder_id,
                title=title or "Reminder",
                remind_at=remind_at,
                user_id=user_id,
            )


        if not updated:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    "Reminder could not "
                    "be updated. It may "
                    "already be triggered "
                    "or cancelled."
                ),
            }


        return {
            "status": "success",
            "type": "reminder",
            "action": "updated",
            "reminder": updated,
        }


    except Exception as e:

        return {
            "status": "error",
            "type": "reminder",
            "message": str(e),
        }


# ==========================================================
# DELETE REMINDER
# ==========================================================

def delete_reminder(
    reminder_id=None,
    title=None,
    user_id=None,
):

    try:

        if not reminder_id and not title:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    "A reminder ID or title "
                    "is required."
                ),
            }


        # --------------------------------------------------
        # Find by title
        # --------------------------------------------------

        if not reminder_id:

            matches = find_reminder_by_title(
                    title,
                    user_id=user_id
                )


            if len(matches) == 0:

                return {
                    "status": "error",
                    "type": "reminder",
                    "message": (
                        f"No active reminder "
                        f"matching '{title}' "
                        f"was found."
                    ),
                }


            if len(matches) > 1:

                return {
                    "status": "error",
                    "type": "reminder",
                    "message": (
                        "Multiple reminders "
                        "matched. Please provide "
                        "a more specific reminder."
                    ),
                    "matches": matches,
                }


            reminder_id =matches[0]["id"]


        deleted = delete_reminder_record(
                reminder_id,
                user_id=user_id,
            )


        if not deleted:

            return {
                "status": "error",
                "type": "reminder",
                "message": (
                    "Reminder could not "
                    "be deleted."
                ),
            }


        return {
            "status": "success",
            "type": "reminder",
            "action": "deleted",
            "reminder_id":
                reminder_id,
        }


    except Exception as e:

        return {
            "status": "error",
            "type": "reminder",
            "message": str(e),
        }