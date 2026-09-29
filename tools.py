tasks = []
reminders = []


from ddgs import DDGS


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


def create_reminder(title: str, time: str):

    reminder = {
        "id": len(reminders) + 1,
        "title": title,
        "time": time
    }

    reminders.append(reminder)

    return {
        "status": "success",
        "type": "reminder",
        "reminder": reminder
    }


def browser_open(url: str):

    return {
        "status": "success",
        "type": "browser",
        "url": url,
        "message": f"Browser opened {url}"
    }