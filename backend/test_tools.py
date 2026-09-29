from tools import search_web

result = search_web("Cisco software engineer interview questions")

print("\nSTATUS:", result["status"])
print("QUERY:", result["query"])

for i, item in enumerate(result.get("results", []), 1):
    print(f"\n--- Result {i} ---")
    print("Title:", item["title"])
    print("URL:", item["url"])
    print("Content:", item["content"])