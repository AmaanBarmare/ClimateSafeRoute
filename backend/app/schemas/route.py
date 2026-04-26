"""Pydantic v2 request/response schemas for the /route endpoint."""
from typing import Any

from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=200)
    destination: str = Field(..., min_length=3, max_length=200)


class RouteStats(BaseModel):
    geojson: dict[str, Any]      # GeoJSON Feature with LineString geometry
    distance_m: float
    duration_min: float
    heat_score: float            # 0-100
    flood_score: float           # 0-100
    canopy_pct: float            # 0-100


class RouteResponse(BaseModel):
    route_shortest: RouteStats
    route_climate: RouteStats
    explanation: str
    origin_coords: tuple[float, float]       # (lng, lat)
    destination_coords: tuple[float, float]  # (lng, lat)
