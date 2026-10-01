# ============================================================
# WEB SEARCH
# ============================================================
import os
import json
from groq import Groq
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
from google_calendar import (
    calendar_list_events,
    calendar_create_event,
    calendar_update_event,
    calendar_delete_event,
)


def browser_open(url: str):

    return open_browser(url)
# ============================================================
# GENERATE ANSWER
# ============================================================
def generate_answer(instruction: str, context: dict):

    try:
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            return {
                "status": "error",
                "type": "answer",
                "message": "GROQ_API_KEY is not configured"
            }

        client = Groq(api_key=api_key)

        goal = context.get("goal", "")

        previous_results = context.get("results", [])

        # Only pass useful tool output to the LLM
        research_data = json.dumps(
            previous_results,
            indent=2,
            ensure_ascii=False
        )

        prompt = f"""
You are the final answer generator for Goal2Done.

USER GOAL:
{goal}

USER REQUEST:
{instruction}

RESEARCH / INFORMATION FROM PREVIOUS ACTIONS:
{research_data}

Create the final response that should be shown directly to the user.

IMPORTANT:

The user wants a CLEAN, SHORT, READABLE answer.

Follow these rules:

1. Answer the user's actual question directly.
2. Do not dump research results.
3. Do not repeat information.
4. Do not mention Goal2Done, tools, planner, executor,
   verification, execution, context, APIs, or internal processing.
5. Do not use HTML.
6. Do not use <br>, <div>, or other HTML tags.
7. Use simple Markdown.
8. Prefer short paragraphs and bullet points.
9. Avoid huge tables unless the user explicitly asks for a table.
10. Keep normal answers between approximately 100-300 words.
11. If the question is simple, keep the answer around 50-150 words.
12. Use headings only when they improve readability.
13. Highlight important terms with **bold**.
14. Do not provide unnecessary background information.
15. Do not repeat the question.
16. Do not add a long conclusion.

For a simple technical question, use this structure when appropriate:

### Topic — Quick Overview

One or two sentence introduction.

**Key points**
- Point 1
- Point 2
- Point 3
- Point 4
- Point 5

**Common uses**
- Use 1
- Use 2
- Use 3

**In short:** One concise summary.

For research questions:

### Short Answer

One concise summary.

### Key Findings

1. **Finding 1** — short explanation
2. **Finding 2** — short explanation
3. **Finding 3** — short explanation
4. **Finding 4** — short explanation
5. **Finding 5** — short explanation

### Recommendation / Next Step

Only include this section if it is useful for the user's request.

For study plans:

### 7-Day Study Plan

#### Day 1 — Topic
- Task
- Task
- Task

**Time:** ~3 hours

Keep each day concise.

Return ONLY the final user-facing answer.
"""

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful final-answer generator. "
                        "Give the user the actual result they requested."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2
        )

        answer = response.choices[0].message.content

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