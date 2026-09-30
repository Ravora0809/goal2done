tasks = []
reminders = []


# ============================================================
# WEB SEARCH
# ============================================================

from ddgs import DDGS
from datetime import datetime, timezone
import dateparser

from database import create_reminder_record


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