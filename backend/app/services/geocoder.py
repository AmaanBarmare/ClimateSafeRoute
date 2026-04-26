"""Address → (lng, lat) via Nominatim (OpenStreetMap). No API key needed.

Bounded to NYC viewport to bias results. Returns None for unresolvable addresses.
"""
from typing import Optional

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "ClimateSafeRoute/1.0 (https://github.com/AmaanBarmare/ClimateSafeRoute)"
NYC_VIEWBOX = "-74.259,40.477,-73.700,40.917"


async def geocode(address: str) -> Optional[tuple[float, float]]:
    query = address if "new york" in address.lower() else f"{address}, New York, NY"

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            NOMINATIM_URL,
            params={
                "q": query,
                "format": "json",
                "limit": 1,
                "countrycodes": "us",
                "bounded": 1,
                "viewbox": NYC_VIEWBOX,
            },
            headers={"User-Agent": USER_AGENT},
        )

    response.raise_for_status()
    results = response.json()
    if not results:
        return None

    first = results[0]
    # GeoJSON convention: (longitude, latitude)
    return (float(first["lon"]), float(first["lat"]))
