# BACKEND.md — ClimateSafe Route

Complete specification for the FastAPI backend. Every service, function signature, database interaction, and error condition is defined here. Build exactly what is described.

---

## Application Entry Point

**File:** `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routers import route
from app.services.graph import load_graph_on_startup

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the scored street graph from PostGIS into memory on startup
    await load_graph_on_startup()
    yield

app = FastAPI(
    title="ClimateSafe Route API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",  # update with exact domain after deploy
    ],
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(route.router, prefix="", tags=["routing"])

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## Router

**File:** `app/routers/route.py`

Single endpoint. Orchestrates all services in sequence.

```python
from fastapi import APIRouter, HTTPException
from app.schemas.route import RouteRequest, RouteResponse
from app.services.geocoder import geocode
from app.services.routing import compute_routes
from app.services.llm import generate_explanation

router = APIRouter()

@router.post("/route", response_model=RouteResponse)
async def get_route(request: RouteRequest) -> RouteResponse:
    # Step 1: Geocode both addresses
    origin_coords = await geocode(request.origin)
    if not origin_coords:
        raise HTTPException(status_code=422, detail="Could not resolve origin address")
    
    destination_coords = await geocode(request.destination)
    if not destination_coords:
        raise HTTPException(status_code=422, detail="Could not resolve destination address")
    
    # Step 2: Compute both routes
    try:
        route_shortest, route_climate = await compute_routes(origin_coords, destination_coords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Routing failed: {str(e)}")
    
    # Step 3: Generate LLM explanation
    explanation = await generate_explanation(route_shortest, route_climate)
    
    return RouteResponse(
        route_shortest=route_shortest,
        route_climate=route_climate,
        explanation=explanation,
        origin_coords=origin_coords,
        destination_coords=destination_coords,
    )
```

---

## Schemas

**File:** `app/schemas/route.py`

Use Pydantic v2. All fields required unless marked Optional.

```python
from pydantic import BaseModel, Field
from typing import Any

class RouteRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=200)
    destination: str = Field(..., min_length=3, max_length=200)

class RouteStats(BaseModel):
    geojson: dict[str, Any]      # GeoJSON Feature with LineString geometry
    distance_m: float
    duration_min: float           # walking time: distance_m / 83.0 (avg walking speed m/min)
    heat_score: float             # 0–100, normalized
    flood_score: float            # 0–100, normalized
    canopy_pct: float             # 0–100, percentage of route with canopy

class RouteResponse(BaseModel):
    route_shortest: RouteStats
    route_climate: RouteStats
    explanation: str
    origin_coords: tuple[float, float]       # (lng, lat)
    destination_coords: tuple[float, float]  # (lng, lat)
```

---

## Services

### Geocoder

**File:** `app/services/geocoder.py`

Uses Nominatim (OpenStreetMap). No API key required. Rate limit: 1 request per second — use `asyncio.sleep(1)` between consecutive calls if needed.

```python
import httpx
import asyncio
from typing import Optional

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "ClimateSafeRoute/1.0 (contact@yourdomain.com)"}

async def geocode(address: str) -> Optional[tuple[float, float]]:
    """
    Convert a text address to (longitude, latitude).
    Appends ', New York, NY' if not already present to bias results.
    Returns None if no result found.
    """
    query = address if "new york" in address.lower() else f"{address}, New York, NY"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            NOMINATIM_URL,
            params={
                "q": query,
                "format": "json",
                "limit": 1,
                "countrycodes": "us",
                "bounded": 1,
                "viewbox": "-74.259,40.477,-73.700,40.917",  # NYC bounding box
            },
            headers=HEADERS,
            timeout=10.0,
        )
    
    results = response.json()
    if not results:
        return None
    
    first = results[0]
    return (float(first["lon"]), float(first["lat"]))  # (lng, lat) — GeoJSON order
```

---

### Graph Service

**File:** `app/services/graph.py`

The scored NetworkX graph is loaded from PostGIS once at startup and held in module-level memory. All routing calls use this in-memory graph — never reload per request.

```python
import networkx as nx
import geopandas as gpd
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.connection import get_session
from typing import Optional

# Module-level graph cache
_graph: Optional[nx.DiGraph] = None

async def load_graph_on_startup() -> None:
    """
    Called once at app startup via lifespan.
    Loads all street edges from PostGIS and builds a NetworkX DiGraph.
    Stores the graph in the module-level _graph variable.
    """
    global _graph
    async with get_session() as session:
        # Fetch all edges from the pre-scored street_edges table
        result = await session.execute(
            "SELECT source_node, target_node, length_m, climate_score, "
            "heat_score, flood_score, canopy_pct, geometry "
            "FROM street_edges"
        )
        rows = result.fetchall()
    
    G = nx.DiGraph()
    for row in rows:
        G.add_edge(
            row.source_node,
            row.target_node,
            length=row.length_m,
            climate_score=row.climate_score,
            heat_score=row.heat_score,
            flood_score=row.flood_score,
            canopy_pct=row.canopy_pct,
            geometry=row.geometry,
        )
    
    _graph = G
    print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

def get_graph() -> nx.DiGraph:
    if _graph is None:
        raise RuntimeError("Graph not loaded. Did startup complete?")
    return _graph
```

---

### Routing Service

**File:** `app/services/routing.py`

```python
import networkx as nx
import osmnx as ox
from shapely.geometry import LineString, mapping
from app.services.graph import get_graph
from app.schemas.route import RouteStats
from typing import Tuple

WALKING_SPEED_M_PER_MIN = 83.0  # 5 km/h

async def compute_routes(
    origin: tuple[float, float],
    destination: tuple[float, float],
) -> Tuple[RouteStats, RouteStats]:
    """
    Compute two routes between origin and destination.
    origin/destination are (lng, lat) tuples.
    Returns (route_shortest, route_climate).
    """
    G = get_graph()
    
    # Find nearest graph nodes to origin and destination
    # ox.nearest_nodes expects (X=lng, Y=lat)
    origin_node = ox.nearest_nodes(G, X=origin[0], Y=origin[1])
    dest_node = ox.nearest_nodes(G, X=destination[0], Y=destination[1])
    
    if origin_node == dest_node:
        raise ValueError("Origin and destination resolve to the same street node")
    
    # Route A: shortest by distance
    path_shortest = nx.shortest_path(G, origin_node, dest_node, weight='length')
    
    # Route B: climate-smart (minimize composite climate_score)
    path_climate = nx.shortest_path(G, origin_node, dest_node, weight='climate_score')
    
    route_shortest = _path_to_route_stats(G, path_shortest)
    route_climate = _path_to_route_stats(G, path_climate)
    
    return route_shortest, route_climate

def _path_to_route_stats(G: nx.DiGraph, path: list) -> RouteStats:
    """
    Convert a list of node IDs to a RouteStats object.
    Extracts geometry and aggregates climate scores along the path.
    """
    coordinates = []
    total_length = 0.0
    heat_scores = []
    flood_scores = []
    canopy_pcts = []
    
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_data = G[u][v]
        
        # Geometry: each edge stores its LineString geometry as WKT or coordinates
        geom = edge_data.get('geometry')
        if geom:
            coords = list(geom.coords) if hasattr(geom, 'coords') else geom
            if not coordinates:
                coordinates.extend(coords)
            else:
                coordinates.extend(coords[1:])  # skip first to avoid duplicate
        
        total_length += edge_data.get('length', 0)
        heat_scores.append(edge_data.get('heat_score', 50))
        flood_scores.append(edge_data.get('flood_score', 0))
        canopy_pcts.append(edge_data.get('canopy_pct', 0))
    
    # Aggregate: length-weighted mean for scores
    avg_heat = sum(heat_scores) / len(heat_scores) if heat_scores else 0
    avg_flood = sum(flood_scores) / len(flood_scores) if flood_scores else 0
    avg_canopy = sum(canopy_pcts) / len(canopy_pcts) if canopy_pcts else 0
    
    # Build GeoJSON Feature
    line = LineString(coordinates)
    geojson = {
        "type": "Feature",
        "geometry": mapping(line),
        "properties": {}
    }
    
    return RouteStats(
        geojson=geojson,
        distance_m=round(total_length, 1),
        duration_min=round(total_length / WALKING_SPEED_M_PER_MIN, 1),
        heat_score=round(avg_heat, 1),
        flood_score=round(avg_flood, 1),
        canopy_pct=round(avg_canopy, 1),
    )
```

---

### LLM Service

**File:** `app/services/llm.py`

```python
import os
from openai import OpenAI
from app.schemas.route import RouteStats

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

SYSTEM_PROMPT = """You are a helpful urban climate assistant.
You explain pedestrian route tradeoffs clearly and concisely to everyday users.
Focus on practical impact: temperature, shade, flood risk. Avoid technical jargon.
Write in plain English. Two to three sentences maximum.
Do not use bullet points, lists, or markdown formatting in your response."""

async def generate_explanation(shortest: RouteStats, climate: RouteStats) -> str:
    """
    Call OpenAI API (gpt-5-mini) to generate a plain English explanation of the route tradeoff.
    Returns the explanation string. Falls back to a template if API call fails.
    """
    user_prompt = f"""Compare these two pedestrian routes in NYC and explain the tradeoff:

Shortest route:
- Walking time: {shortest.duration_min:.0f} minutes ({shortest.distance_m:.0f}m)
- Heat vulnerability score: {shortest.heat_score:.0f}/100 (higher = hotter streets)
- Flood risk score: {shortest.flood_score:.0f}/100 (higher = more risk)
- Tree canopy coverage: {shortest.canopy_pct:.0f}%

Climate-smart route:
- Walking time: {climate.duration_min:.0f} minutes ({climate.distance_m:.0f}m)
- Heat vulnerability score: {climate.heat_score:.0f}/100
- Flood risk score: {climate.flood_score:.0f}/100
- Tree canopy coverage: {climate.canopy_pct:.0f}%

Explain the tradeoff to a pedestrian deciding which route to take. Be specific about the differences."""

    try:
        response = client.chat.completions.create(
            model="gpt-5-mini",
            max_completion_tokens=200,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        # Fallback explanation if API fails
        time_diff = climate.duration_min - shortest.duration_min
        heat_diff = shortest.heat_score - climate.heat_score
        return (
            f"The climate-smart route takes {time_diff:.0f} extra minutes "
            f"but reduces heat exposure by {heat_diff:.0f} points and increases "
            f"tree canopy from {shortest.canopy_pct:.0f}% to {climate.canopy_pct:.0f}%."
        )
```

---

## Database

### Connection

**File:** `app/db/connection.py`

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from contextlib import asynccontextmanager
import os

DATABASE_URL = os.environ["DATABASE_URL"]
# Ensure async driver: replace postgresql:// with postgresql+asyncpg://
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(ASYNC_DATABASE_URL, echo=False, pool_size=5)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

@asynccontextmanager
async def get_session():
    async with SessionLocal() as session:
        yield session
```

### Models

**File:** `app/db/models.py`

SQLAlchemy ORM models matching the PostGIS schema defined in DATABASE.md.

```python
from sqlalchemy import Column, Float, Integer, String, BigInteger
from sqlalchemy.orm import DeclarativeBase
from geoalchemy2 import Geometry

class Base(DeclarativeBase):
    pass

class StreetEdge(Base):
    __tablename__ = "street_edges"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    source_node = Column(BigInteger, nullable=False, index=True)
    target_node = Column(BigInteger, nullable=False, index=True)
    length_m = Column(Float, nullable=False)
    climate_score = Column(Float, nullable=False)  # composite, 0–1
    heat_score = Column(Float, nullable=False)      # normalized 0–100
    flood_score = Column(Float, nullable=False)     # normalized 0–100
    canopy_pct = Column(Float, nullable=False)      # 0–100
    geometry = Column(Geometry("LINESTRING", srid=4326), nullable=False)

class ClimateHVI(Base):
    __tablename__ = "climate_hvi"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nta_code = Column(String, nullable=False)
    hvi_rank = Column(Integer, nullable=False)   # 1–5
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)

class ClimateCanopy(Base):
    __tablename__ = "climate_canopy"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    canopy_pct = Column(Float, nullable=False)
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)

class ClimateFlood(Base):
    __tablename__ = "climate_flood"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    fld_zone = Column(String, nullable=False)    # AE, VE, X, etc.
    risk_score = Column(Float, nullable=False)   # derived: AE=80, VE=95, X=20, else=5
    geometry = Column(Geometry("MULTIPOLYGON", srid=4326), nullable=False)
```

---

## Flood Zone Risk Score Mapping

When ingesting FEMA flood data, convert `fld_zone` to a numeric `risk_score`:

```python
FLOOD_ZONE_SCORES = {
    "VE": 95,   # Coastal high hazard
    "AE": 80,   # High risk
    "AO": 70,   # High risk, sheet flow
    "AH": 65,   # High risk, ponding
    "A": 60,    # High risk, no BFE
    "X": 20,    # Moderate to low risk
    "D": 10,    # Undetermined
}
DEFAULT_FLOOD_SCORE = 5  # For any unlisted zone
```

---

## Requirements

**File:** `backend/requirements.txt`

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
httpx==0.27.0
openai==1.54.3
osmnx==1.9.3
networkx==3.3
geopandas==0.14.4
shapely==2.0.4
sqlalchemy==2.0.30
asyncpg==0.29.0
geoalchemy2==0.15.1
psycopg2-binary==2.9.9
pandas==2.2.2
numpy==1.26.4
python-dotenv==1.0.1
```

---

## Dockerfile

**File:** `backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for GeoPandas and PostGIS drivers
RUN apt-get update && apt-get install -y \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Error Handling Rules

- Always catch geocoding failures and raise HTTP 422, never 500
- Always catch NetworkX `NetworkXNoPath` and raise HTTP 500 with "No route found"
- Never let the LLM service failure propagate — always fall back to the template explanation
- Log all exceptions to stdout with `print()` — Railway captures stdout as logs
- Never expose internal Python stack traces in HTTP error responses

---

## Logging

Use `print()` for all logging. Railway captures stdout. Log the following events:
- App startup: graph loaded, node/edge count
- Each POST /route: origin, destination, route A length, route B length, LLM success/fallback
- Geocoding failures: which address failed
- Any exception caught in the router
