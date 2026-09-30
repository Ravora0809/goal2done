import threading
import time
from datetime import datetime, timezone

from database import (
    get_due_reminders,
    mark_reminder_triggered
)

from notifier import send_notification


CHECK_INTERVAL = 5


def reminder_worker():

    print("🔔 Goal2Done reminder scheduler started.")

    while True:

        try:

            now = datetime.now(timezone.utc).isoformat()

            reminders = get_due_reminders(now)

            for reminder in reminders:

                print(
                    f"🔔 Triggering reminder: "
                    f"{reminder['title']}"
                )

                result = send_notification(
                    "Goal2Done",
                    reminder["title"]
                )

                print(
                    f"Notification result: {result}"
                )

                mark_reminder_triggered(
                    reminder["id"]
                )

        except Exception as e:

            print(
                f"Reminder scheduler error: {e}"
            )

        time.sleep(CHECK_INTERVAL)


def start_reminder_scheduler():

    thread = threading.Thread(
        target=reminder_worker,
        daemon=True
    )

    thread.start()

    return thread