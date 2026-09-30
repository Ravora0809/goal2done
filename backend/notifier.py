import platform
import subprocess
import shutil


def escape_applescript(value: str):
    return value.replace("\\", "\\\\").replace('"', '\\"')


def send_notification(title: str, message: str):

    system = platform.system()

    if system == "Darwin":
        return send_macos_notification(title, message)

    if system == "Windows":
        return send_windows_notification(title, message)

    if system == "Linux":
        return send_linux_notification(title, message)

    return send_console_notification(title, message)


def send_macos_notification(title: str, message: str):

    try:
        title = escape_applescript(title)
        message = escape_applescript(message)

        script = (
            f'display notification "{message}" '
            f'with title "{title}"'
        )

        subprocess.run(
            ["osascript", "-e", script],
            check=True
        )

        return {
            "status": "success",
            "platform": "macOS"
        }

    except Exception as e:

        return {
            "status": "error",
            "platform": "macOS",
            "message": str(e)
        }


def send_windows_notification(title: str, message: str):

    try:

        from win10toast import ToastNotifier

        toaster = ToastNotifier()

        toaster.show_toast(
            title,
            message,
            duration=8,
            threaded=True
        )

        return {
            "status": "success",
            "platform": "Windows"
        }

    except Exception as e:

        return {
            "status": "error",
            "platform": "Windows",
            "message": str(e)
        }


def send_linux_notification(title: str, message: str):

    try:

        if not shutil.which("notify-send"):
            return send_console_notification(
                title,
                message
            )

        subprocess.run(
            ["notify-send", title, message],
            check=True
        )

        return {
            "status": "success",
            "platform": "Linux"
        }

    except Exception as e:

        return {
            "status": "error",
            "platform": "Linux",
            "message": str(e)
        }


def send_console_notification(title: str, message: str):

    print("\n")
    print("=" * 55)
    print("🔔 GOAL2DONE REMINDER")
    print("=" * 55)
    print(f"{title}")
    print(message)
    print("=" * 55)
    print("\n")

    return {
        "status": "success",
        "platform": "console"
    }