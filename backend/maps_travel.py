"""Free OpenStreetMap-based maps tools for Goal2Done.

Uses:
- Nominatim (OpenStreetMap) for geocoding and place search
- OSRM for driving routes, distance, and ETA

No API key is required for the public endpoints, but their usage policies
and rate limits must be respected.
"""

import json
import time
from urllib.parse import urlencode, quote_plus
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import ssl

try:
    import certifi
except ImportError:
    certifi = None

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
OSRM_URL = "https://router.project-osrm.org"
USER_AGENT = "Goal2Done/1.0 (hackathon prototype)"

# macOS Python installations can lack a usable system CA bundle.
# Prefer certifi when available so HTTPS validation remains enabled.
_SSL_CONTEXT = (
    ssl.create_default_context(cafile=certifi.where())
    if certifi is not None
    else ssl.create_default_context()
)

# Small in-process cache keeps repeated demo requests from unnecessarily
# hitting the public Nominatim service.
_GEOCODE_CACHE = {}
_LAST_NOMINATIM_REQUEST = 0.0


def _get_json(url: str, params: dict | None = None, timeout: int = 20):
    if params:
        url = f"{url}?{urlencode(params)}"

    request = Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
        method="GET",
    )

    with urlopen(request, timeout=timeout, context=_SSL_CONTEXT) as response:
        return json.loads(response.read().decode("utf-8"))


def _nominatim_get(endpoint: str, params: dict):
    """Call Nominatim while respecting the public 1 req/sec policy."""
    global _LAST_NOMINATIM_REQUEST

    now = time.monotonic()
    wait = 1.0 - (now - _LAST_NOMINATIM_REQUEST)
    if wait > 0:
        time.sleep(wait)

    try:
        result = _get_json(f"{NOMINATIM_URL}{endpoint}", params=params)
        _LAST_NOMINATIM_REQUEST = time.monotonic()
        return result
    except Exception:
        _LAST_NOMINATIM_REQUEST = time.monotonic()
        raise


def _geocode(place: str):
    key = place.strip().lower()
    if key in _GEOCODE_CACHE:
        return _GEOCODE_CACHE[key]

    results = _nominatim_get(
        "/search",
        {
            "q": place,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        },
    )

    if not results:
        raise ValueError(f"Could not find a location for '{place}'.")

    item = results[0]
    location = {
        "display_name": item.get("display_name", place),
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
        "osm_type": item.get("osm_type"),
        "osm_id": item.get("osm_id"),
        "type": item.get("type"),
        "category": item.get("category"),
    }
    _GEOCODE_CACHE[key] = location
    return location


def maps_search(query: str):
    """Search OpenStreetMap/Nominatim for places or addresses."""
    if not query or not query.strip():
        return {"status": "error", "type": "maps", "message": "query is required"}

    try:
        results = _nominatim_get(
            "/search",
            {
                "q": query.strip(),
                "format": "jsonv2",
                "limit": 5,
                "addressdetails": 1,
            },
        )

        places = []
        for item in results:
            lat = item.get("lat")
            lon = item.get("lon")
            if lat is None or lon is None:
                continue

            lat = float(lat)
            lon = float(lon)
            places.append(
                {
                    "name": item.get("name") or item.get("display_name", "").split(",")[0],
                    "display_name": item.get("display_name"),
                    "latitude": lat,
                    "longitude": lon,
                    "type": item.get("type"),
                    "category": item.get("category"),
                    "osm_type": item.get("osm_type"),
                    "osm_id": item.get("osm_id"),
                    "map_url": f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=17/{lat}/{lon}",
                }
            )

        if not places:
            return {
                "status": "error",
                "type": "maps_search",
                "query": query,
                "message": f"No OpenStreetMap results found for '{query}'.",
            }

        # The first result is the primary result while all results remain available.
        primary = places[0]
        return {
            "status": "success",
            "type": "maps_search",
            "provider": "OpenStreetMap Nominatim",
            "query": query,
            "name": primary["name"],
            "display_name": primary["display_name"],
            "latitude": primary["latitude"],
            "longitude": primary["longitude"],
            "map_url": primary["map_url"],
            "url": primary["map_url"],
            "places": places,
        }

    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        return {
            "status": "error",
            "type": "maps_search",
            "query": query,
            "message": str(exc),
        }
    except Exception as exc:
        return {
            "status": "error",
            "type": "maps_search",
            "query": query,
            "message": str(exc),
        }


def maps_directions(origin: str, destination: str, mode: str = "driving"):
    """Return a driving route using Nominatim geocoding + OSRM."""
    if not origin or not destination:
        return {
            "status": "error",
            "type": "maps_directions",
            "message": "origin and destination are required",
        }

    mode = (mode or "driving").lower().strip()
    if mode != "driving":
        return {
            "status": "error",
            "type": "maps_directions",
            "message": "The free public OSRM endpoint currently supports driving routes in this integration. Use mode='driving'.",
        }

    try:
        origin_location = _geocode(origin)
        destination_location = _geocode(destination)

        coordinates = (
            f"{origin_location['lon']},{origin_location['lat']}"
            f";{destination_location['lon']},{destination_location['lat']}"
        )

        route_data = _get_json(
            f"{OSRM_URL}/route/v1/driving/{coordinates}",
            {
                "overview": "false",
                "steps": "false",
                "alternatives": "false",
            },
        )

        routes = route_data.get("routes", [])
        if not routes:
            return {
                "status": "error",
                "type": "maps_directions",
                "message": "No driving route was found between the two locations.",
            }

        route = routes[0]
        distance_meters = float(route.get("distance", 0))
        duration_seconds = float(route.get("duration", 0))

        distance_km = round(distance_meters / 1000, 2)
        duration_minutes = round(duration_seconds / 60)

        route_url = (
            "https://www.openstreetmap.org/directions?engine=fossgis_osrm_car"
            f"&route={origin_location['lat']}%2C{origin_location['lon']}%3B"
            f"{destination_location['lat']}%2C{destination_location['lon']}"
        )

        return {
            "status": "success",
            "type": "maps_directions",
            "provider": "OpenStreetMap + OSRM",
            "origin": origin,
            "destination": destination,
            "mode": "driving",
            "origin_location": origin_location,
            "destination_location": destination_location,
            "distance_meters": round(distance_meters),
            "distance_km": distance_km,
            "duration_seconds": round(duration_seconds),
            "duration_minutes": duration_minutes,
            "distance": f"{distance_km} km",
            "duration": f"{duration_minutes} min",
            "map_url": route_url,
            "url": route_url,
        }

    except (HTTPError, URLError, TimeoutError, ValueError, KeyError) as exc:
        return {
            "status": "error",
            "type": "maps_directions",
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "message": str(exc),
        }
    except Exception as exc:
        return {
            "status": "error",
            "type": "maps_directions",
            "origin": origin,
            "destination": destination,
            "mode": mode,
            "message": str(exc),
        }
