from playwright.sync_api import sync_playwright


def open_browser(url: str):

    try:
        with sync_playwright() as p:

            browser = p.chromium.launch(headless=True)

            page = browser.new_page()

            page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=30000
            )

            title = page.title()
            current_url = page.url

            browser.close()

            return {
                "status": "success",
                "type": "browser",
                "url": current_url,
                "title": title,
                "message": f"Successfully opened {url}"
            }

    except Exception as e:

        return {
            "status": "error",
            "type": "browser",
            "url": url,
            "message": str(e)
        }