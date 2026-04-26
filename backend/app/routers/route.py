"""POST /route — orchestrates geocoding, dual-path routing, and LLM explanation."""
import asyncio

from fastapi import APIRouter, HTTPException

from app.schemas.route import RouteRequest, RouteResponse
from app.services.geocoder import geocode
from app.services.llm import generate_explanation
from app.services.routing import compute_routes

router = APIRouter()


@router.post("/route", response_model=RouteResponse)
async def get_route(request: RouteRequest) -> RouteResponse:
    origin = await geocode(request.origin)
    if origin is None:
        raise HTTPException(status_code=422, detail="Could not resolve origin address")

    destination = await geocode(request.destination)
    if destination is None:
        raise HTTPException(status_code=422, detail="Could not resolve destination address")

    try:
        # Routing is CPU-bound (NetworkX) — run in default executor to avoid blocking the loop
        loop = asyncio.get_running_loop()
        route_shortest, route_climate = await loop.run_in_executor(
            None, compute_routes, origin, destination
        )
    except Exception as exc:
        print(f"[router] routing failed: {exc!r}")
        raise HTTPException(status_code=500, detail=f"Routing failed: {exc}") from exc

    explanation = await loop.run_in_executor(
        None, generate_explanation, route_shortest, route_climate
    )

    print(
        f"[route] {request.origin!r} -> {request.destination!r} "
        f"| shortest {route_shortest.distance_m:.0f}m "
        f"| climate {route_climate.distance_m:.0f}m"
    )

    return RouteResponse(
        route_shortest=route_shortest,
        route_climate=route_climate,
        explanation=explanation,
        origin_coords=origin,
        destination_coords=destination,
    )
