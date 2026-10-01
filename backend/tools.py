# ============================================================
# WEB SEARCH
# ============================================================
import os
import json
from llm_client import (
    chat_completion,
    ANSWER_MODEL,
)
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

def create_reminder(title: str, time: str):
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
            remind_at=remind_at
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


def browser_open(url: str):

    return open_browser(url)
# ============================================================
# GENERATE ANSWER
# ============================================================
# ============================================================
# GENERATE ANSWER
# ============================================================

def generate_answer(instruction: str, context: dict):

    try:

        goal = context.get(
            "goal",
            ""
        )

        previous_results = context.get(
            "results",
            []
        )

        # ----------------------------------------------------
        # Prepare research information
        # ----------------------------------------------------

        research_data = json.dumps(
            previous_results,
            indent=2,
            ensure_ascii=False
        )

        # ----------------------------------------------------
        # Final answer prompt
        # ----------------------------------------------------

        prompt = f"""
You are the final answer generator for Goal2Done.

USER GOAL:
{goal}

USER REQUEST:
{instruction}

INFORMATION COLLECTED FROM PREVIOUS ACTIONS:
{research_data}

Create the final response that should be shown
directly to the user.

IMPORTANT RULES:

1. Answer the user's actual request directly.

2. Use the information collected from previous actions.

3. Do not invent information.

4. If the collected information is insufficient,
   clearly say what is missing.

5. Do not mention:
   - Goal2Done
   - planner
   - executor
   - verifier
   - tools
   - internal processing
   - APIs
   - execution context

6. Do not dump raw research results.

7. Synthesize the information.

8. Use simple Markdown.

9. Prefer short paragraphs and bullet points.

10. Use headings when useful.

11. Highlight important information using **bold**.

12. Avoid unnecessary background information.

13. Do not repeat the user's question.

14. For research tasks, provide:
    - a short answer
    - key findings
    - useful next steps when appropriate

15. If sources contain conflicting information,
    clearly mention the conflict.

16. Keep normal answers around 100-300 words.

17. Simple questions can be shorter.

Return ONLY the final answer.
"""

        # ----------------------------------------------------
        # OpenRouter
        # ----------------------------------------------------

        response = chat_completion(
            model=ANSWER_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise, concise "
                        "final answer generator."
                    ),
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=3000,
            fallback_models=[
        "openai/gpt-6-luna",
        "anthropic/claude-sonnet-4.5",
    ],
        )

        answer = (
            response
            .choices[0]
            .message
            .content
            .strip()
        )

        if not answer:

            return {
                "status": "error",
                "type": "answer",
                "message": "Model returned an empty answer."
            }

        return {
            "status": "success",
            "type": "answer",
            "answer": answer
        }

    except Exception as e:

        return {
            "status": "error",
            "type": "answer",
            "message": str(e)
        }



# ==========================================================
# UPDATE REMINDER
# ==========================================================

def update_reminder(
    reminder_id=None,
    title=None,
    time=None,
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

            matches =find_reminder_by_title(
                    title
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


        updated =update_reminder_record(
                reminder_id=
                    reminder_id,

                title=
                    title or "Reminder",

                remind_at=
                    remind_at,
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

            matches =find_reminder_by_title(
                    title
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


        deleted =delete_reminder_record(
                reminder_id
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