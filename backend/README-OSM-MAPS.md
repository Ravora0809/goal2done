# Goal2Done — Free OpenStreetMap Maps Integration

This patch replaces the previous Google Maps dependency with a free OpenStreetMap-based implementation.

## Services

- OpenStreetMap + Nominatim: place/address search and geocoding
- OSRM: driving distance and ETA
- No Google Maps API key is required.

## Files changed

- `maps_travel.py` — new OSM/Nominatim + OSRM implementation
- `planner.py` — planner instructions updated to use OSM/OSRM
- `verifier.py` — verifies actual place results and route metrics

The existing `tools.py`, `executor.py`, `firewall.py`, Calendar, Gmail, Drive, Docs, Sheets, and Telegram messaging integration are preserved from the stable backend.

## Test

```bash
python -c "from maps_travel import maps_search; print(maps_search('VIT-AP'))"
python -c "from maps_travel import maps_directions; print(maps_directions('VIT-AP', 'Vijayawada Airport'))"
```

Then run:

```bash
uvicorn main:app --reload
```

Example Goal2Done prompts:

```text
Find VIT-AP on the map.
```

```text
How far is VIT-AP from Vijayawada Airport and how long does it take by car?
```

## Important public-service limits

The public Nominatim service is rate-limited. This implementation intentionally spaces Nominatim requests and caches repeated geocoding calls. For a hackathon demo, keep request volume low and follow the service usage policy.

The public OSRM endpoint is also a shared demo/public service. Do not treat it as an unlimited production routing backend.
