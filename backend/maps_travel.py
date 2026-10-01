"""Maps/travel tools. Uses Google Maps URLs by default; optional Google Routes API for ETA."""
import os
from urllib.parse import quote_plus


def maps_search(query: str):
    if not query:
        return {"status": "error", "type": "maps", "message": "query is required"}
    url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(query)}"
    return {"status": "success", "type": "maps_search", "query": query, "url": url}


def maps_directions(origin: str, destination: str, mode: str = "driving"):
    if not origin or not destination:
        return {"status": "error", "type": "maps_directions", "message": "origin and destination are required"}
    url = (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={quote_plus(origin)}"
        f"&destination={quote_plus(destination)}"
        f"&travelmode={quote_plus(mode)}"
    )
    result = {"status": "success", "type": "maps_directions", "origin": origin, "destination": destination, "mode": mode, "url": url}

    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if api_key:
        try:
            import requests
            response = requests.post(
                "https://routes.googleapis.com/directions/v2:computeRoutes",
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-Api-Key": api_key,
                    "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
                },
                json={
                    "origin": {"address": origin},
                    "destination": {"address": destination},
                    "travelMode": mode.upper(),
                },
                timeout=20,
            )
            response.raise_for_status()
            routes = response.json().get("routes", [])
            if routes:
                result["distance_meters"] = routes[0].get("distanceMeters")
                result["duration"] = routes[0].get("duration")
        except Exception as exc:
            result["api_warning"] = str(exc)

    return result
