"""Generic browser actions for public or already-authenticated sites.

For consequential actions such as update/cancel, the planner routes them through
Goal2Done's approval firewall before execution.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

PROFILE_DIR = Path(os.getenv("GOAL2DONE_BROWSER_PROFILE", Path.cwd() / ".browser-profile")).resolve()


def browser_action(url: str, action: str, target_text: str = "", value: str = "", confirm_text: str = ""):
    action = (action or "click").lower().strip()
    try:
        with sync_playwright() as p:
            PROFILE_DIR.mkdir(parents=True, exist_ok=True)
            context = p.chromium.launch_persistent_context(
                str(PROFILE_DIR),
                headless=True,
            )
            page = context.pages[0] if context.pages else context.new_page()
            page.goto(url, wait_until="domcontentloaded", timeout=30000)

            if action == "click":
                if not target_text:
                    raise ValueError("target_text is required for click")
                page.get_by_text(target_text, exact=True).first.click(timeout=15000)

            elif action in {"fill", "update"}:
                if not target_text or value == "":
                    raise ValueError("target_text and value are required for fill/update")
                locator = page.get_by_label(target_text, exact=True)
                if locator.count() == 0:
                    locator = page.locator(f"input[name='{target_text}'], textarea[name='{target_text}']").first
                locator.fill(value)

            elif action == "cancel":
                if not target_text:
                    raise ValueError("target_text should identify the cancel button")
                page.get_by_text(target_text, exact=True).first.click(timeout=15000)
                if confirm_text:
                    page.get_by_text(confirm_text, exact=True).first.click(timeout=15000)

            elif action == "submit":
                if not target_text:
                    raise ValueError("target_text should identify the submit button")
                page.get_by_text(target_text, exact=True).first.click(timeout=15000)

            elif action == "back":
                page.go_back(wait_until="domcontentloaded")

            else:
                raise ValueError("Supported browser actions: click, fill, update, cancel, submit, back")

            title = page.title()
            current_url = page.url
            context.close()
            return {
                "status": "success",
                "type": "browser_action",
                "action": action,
                "url": current_url,
                "title": title,
                "message": f"Browser action '{action}' completed.",
            }
    except Exception as exc:
        return {"status": "error", "type": "browser_action", "action": action, "url": url, "message": str(exc)}
