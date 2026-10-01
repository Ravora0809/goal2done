"""Messaging integrations for Goal2Done.

Supports Telegram Bot API and macOS Messages for local demos.
"""
import os
import subprocess
from urllib.parse import quote


def send_message(platform: str, recipient: str, message: str):
    platform = (platform or "telegram").lower().strip()

    if not recipient or not message:
        return {"status": "error", "type": "message", "message": "recipient and message are required"}

    try:
        if platform == "telegram":
            import requests
            token = os.getenv("TELEGRAM_BOT_TOKEN")
            if not token:
                raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
            response = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": recipient, "text": message},
                timeout=20,
            )
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise RuntimeError(data.get("description", "Telegram API error"))
            return {
                "status": "success",
                "type": "message",
                "platform": "telegram",
                "recipient": recipient,
                "message_id": data.get("result", {}).get("message_id"),
            }

        if platform == "imessage":
            script = f'tell application "Messages" to send {quote(message)!r} to buddy {quote(recipient)!r}'
            # AppleScript string quoting is safer with JSON-like escaped strings.
            import json
            script = f'tell application "Messages" to send {json.dumps(message)} to buddy {json.dumps(recipient)}'
            subprocess.run(["osascript", "-e", script], check=True, capture_output=True, text=True)
            return {
                "status": "success",
                "type": "message",
                "platform": "imessage",
                "recipient": recipient,
            }

        raise ValueError("Unsupported messaging platform. Use telegram or imessage.")

    except Exception as exc:
        return {"status": "error", "type": "message", "platform": platform, "message": str(exc)}
