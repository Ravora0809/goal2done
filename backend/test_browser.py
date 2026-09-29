from tools import browser_open

result = browser_open("https://example.com")

print("\nRESULT:")
print(result)

if result["status"] == "success":
    print("\nSTATUS:", result["status"])
    print("URL:", result["url"])
    print("TITLE:", result["title"])
else:
    print("\nSTATUS:", result["status"])
    print("ERROR:", result.get("message"))