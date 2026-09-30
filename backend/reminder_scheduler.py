import threading
import time
from datetime import datetime, timezone

from database import get_due_reminders, mark_reminder_triggered
from notifier import send_notification


CHECK_INTERVAL = 5

_scheduler_thread = None
_stop_event = threading.Event()


def reminder_worker():
    print("🔔 Goal2Done reminder scheduler started.")

    while not _stop_event.is_set():
        try:
            now = datetime.now(timezone.utc).isoformat()

            reminders = get_due_reminders(now)

            for reminder in reminders:
                print(f"🔔 Triggering reminder: {reminder['title']}")

                result = send_notification(
                    "Goal2Done",
                    reminder["title"]
                )

                print(f"Notification result: {result}")

                mark_reminder_triggered(reminder["id"])

        except Exception as e:
            print(f"Reminder scheduler error: {e}")

        _stop_event.wait(CHECK_INTERVAL)


def start_reminder_scheduler():
    global _scheduler_thread

    if _scheduler_thread and _scheduler_thread.is_alive():
        print("🔔 Reminder scheduler already running.")
        return _scheduler_thread

    _stop_event.clear()

    _scheduler_thread = threading.Thread(
        target=reminder_worker,
        daemon=True,
        name="goal2done-reminder-scheduler"
    )

    _scheduler_thread.start()

    return _scheduler_thread


def stop_reminder_scheduler():
    _stop_event.set()

    if _scheduler_thread and _scheduler_thread.is_alive():
        _scheduler_thread.join(timeout=2)

    print("🔕 Goal2Done reminder scheduler stopped.")