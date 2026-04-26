# CLAUDE.md — ClimateSafe Route

This file contains everything Claude Code needs to build ClimateSafe Route end to end with minimal ambiguity. Read this entire file before writing any code.

---

## Working Rules (read these before doing anything)

### Rule 1 — The 95% confidence rule
If you are at least 95% confident that the direction you are taking is correct, keep going. Do not pause to ask for permission, do not hedge, and do not propose alternatives "just in case." Only stop to ask when you genuinely cannot decide between two paths, or when an action is destructive or irreversible. Confidence is the bar — not certainty, not consensus.

### Rule 2 — Plan, execute, test, then move on
Work in strict, single-part cycles. For each part of the project:
1. **Plan** the part fully before touching any code — what files change, what the contract is, what "done" looks like.
2. **Execute** only that part.
3. **Test** that part in isolation (run it, hit the endpoint, render the component, inspect the data). Show the user the test result.
4. **Wait for approval** of that part before starting the next one.
5. Then plan the next part and repeat.

Never bundle multiple parts into one execution batch. Never skip the test step. Never start the next part until the current one is approved. Each part is its own complete plan → execute → test loop.

---

## Project Overview

ClimateSafe Route is a pedestrian navigation web app that routes people away from urban heat islands and flood zones, not just the shortest path. A user enters an origin and destination in NYC. The backend computes two routes — the standard shortest path and a climate-smart alternative — and returns them alongside an LLM-generated plain English explanation of the tradeoff. Both routes render simultaneously on an interactive Mapbox map in the frontend.

---

## Monorepo Structure

```
climatesafe-route/
├── frontend/                  # Next.js 14 App Router
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx           # Landing page with search UI
│   │   ├── map/
│   │   │   └── page.tsx       # Map view with dual routes
│   │   └── api/
│   │       └── route/
│   │           └── route.ts   # Next.js API proxy to FastAPI
│   ├── components/
│   │   ├── SearchBar.tsx      # Origin + destination inputs
│   │   ├── RouteMap.tsx       # react-map-gl map component
│   │   ├── RouteLayer.tsx     # Individual route LineLayer
│   │   ├── RoutePanel.tsx     # Side panel with stats + LLM text
│   │   ├── SegmentTooltip.tsx # Hover tooltip on street segments
│   │   └── ToggleSwitch.tsx   # Route A/B visibility toggles
│   ├── lib/
│   │   ├── api.ts             # Typed fetch wrapper to FastAPI
│   │   └── types.ts           # Shared TypeScript types
│   ├── public/
│   ├── .env.local             # NEXT_PUBLIC_MAPBOX_TOKEN, NEXT_PUBLIC_API_URL
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                   # FastAPI Python app
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint
│   │   ├── routers/
│   │   │   └── route.py       # POST /route endpoint
│   │   ├── services/
│   │   │   ├── geocoder.py    # Address → lat/lng via Nominatim
│   │   │   ├── graph.py       # OSMnx graph loading + caching
│   │   │   ├── climate.py     # GeoPandas spatial join logic
│   │   │   ├── routing.py     # NetworkX dual path computation
│   │   │   └── llm.py         # OpenAI API call + prompt
│   │   ├── db/
│   │   │   ├── connection.py  # SQLAlchemy + PostGIS session
│   │   │   └── models.py      # Street edge + climate score models
│   │   └── schemas/
│   │       └── route.py       # Pydantic request/response models
│   ├── scripts/
│   │   ├── ingest_hvi.py      # One-time: load HVI data into PostGIS
│   │   ├── ingest_canopy.py   # One-time: load tree canopy into PostGIS
│   │   ├── ingest_flood.py    # One-time: load FEMA flood zones into PostGIS
│   │   └── precompute_graph.py # One-time: score street graph, store edges
│   ├── data/                  # Raw GeoJSON files (not committed, see README)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env                   # DATABASE_URL, OPENAI_API_KEY
│
├── docker-compose.yml         # Local dev: FastAPI + PostGIS together
└── README.md
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 14 (App Router) | Server components, fast routing, Vercel-native |
| Map rendering | react-map-gl + Mapbox GL JS | GPU-accelerated, animated route lines, beautiful basemaps |
| Styling | Tailwind CSS | Utility-first, fast to build polished UI |
| Backend framework | FastAPI (Python 3.11) | Async, typed, Python ecosystem for geo libraries |
| Geocoding | Nominatim (OSM) | Free, no API key needed for development |
| Street network | OSMnx | Pull NYC street graph from OpenStreetMap |
| Spatial analysis | GeoPandas + Shapely | Spatial joins, geometry operations |
| Routing algorithm | NetworkX | Dijkstra shortest path with custom edge weights |
| Database | PostgreSQL 15 + PostGIS 3 | Store pre-scored street graph, fast spatial queries |
| LLM | OpenAI API (gpt-5-mini) | Plain English route explanation |
| Local dev orchestration | Docker Compose | FastAPI + PostGIS together |
| Frontend deploy | Vercel | Zero-config Next.js deployment |
| Backend deploy | Railway | FastAPI + PostGIS as two Railway services |

---

## Environment Variables

### frontend/.env.local
```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.ey...          # Mapbox public token
NEXT_PUBLIC_API_URL=http://localhost:8000  # FastAPI base URL (local)
```

### backend/.env
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/climatesafe
OPENAI_API_KEY=sk-...
ENVIRONMENT=development                    # development | production
FRONTEND_URL=                              # Vercel URL in production; leave empty locally
```

---

## API Contract

### POST /route

**Request body:**
```json
{
  "origin": "Times Square, New York, NY",
  "destination": "Brooklyn Bridge, New York, NY"
}
```

**Response body:**
```json
{
  "route_shortest": {
    "geojson": { "type": "Feature", "geometry": { "type": "LineString", "coordinates": [[...]] } },
    "distance_m": 4200,
    "duration_min": 52,
    "heat_score": 78,
    "flood_score": 12,
    "canopy_pct": 8
  },
  "route_climate": {
    "geojson": { "type": "Feature", "geometry": { "type": "LineString", "coordinates": [[...]] } },
    "distance_m": 4650,
    "duration_min": 58,
    "heat_score": 41,
    "flood_score": 3,
    "canopy_pct": 34
  },
  "explanation": "The climate-smart route adds 6 minutes but passes through 34% tree canopy versus 8%, significantly reducing heat exposure. It also avoids two FEMA flood-risk zones near the waterfront.",
  "origin_coords": [-73.9857, 40.7580],
  "destination_coords": [-73.9969, 40.7061]
}
```

**Error responses:**
- 422 — Invalid or unresolvable address
- 500 — Routing failure (no path found)

---

## Data Sources and Ingestion

All three datasets must be downloaded manually before running ingestion scripts. Store raw files in `backend/data/`. Do not commit them to git (add `backend/data/` to `.gitignore`).

### 1. NYC Heat Vulnerability Index (HVI)
- URL: https://data.cityofnewyork.us/Health/Heat-Vulnerability-Index-NTA/2jr8-rugk
- Format: GeoJSON or Shapefile by Neighborhood Tabulation Area (NTA)
- Key field: `hvi_rank` (1–5 scale, 5 = most vulnerable)
- Ingestion script: `scripts/ingest_hvi.py`
- Stored in PostGIS table: `climate_hvi`

### 2. NYC Tree Canopy
- URL: https://data.cityofnewyork.us/Environment/Tree-Canopy/by9k-vhck
- Format: GeoJSON polygons with canopy coverage percentage
- Key field: `canopy_pct`
- Ingestion script: `scripts/ingest_canopy.py`
- Stored in PostGIS table: `climate_canopy`

### 3. FEMA Flood Zones (NYC)
- URL: https://data.cityofnewyork.us/Environment/Floodplain/8qam-4vqv
- Format: GeoJSON polygons by flood zone designation
- Key field: `fld_zone` (AE, VE, X = high to low risk)
- Ingestion script: `scripts/ingest_flood.py`
- Stored in PostGIS table: `climate_flood`

### 4. Street Graph Precomputation
After all three climate tables are ingested, run `scripts/precompute_graph.py`. This script:
1. Pulls the Manhattan street network via OSMnx (Brooklyn added later once Manhattan works end-to-end)
2. Converts it to a GeoDataFrame of edges
3. Spatial joins all three climate layers onto each edge
4. Computes a composite `climate_score` per edge: `(hvi_norm * 0.5) + (flood_norm * 0.3) + (1 - canopy_norm) * 0.2`
5. Stores each edge as a row in PostGIS table `street_edges` with geometry + scores
6. Logs total edges processed

This script runs once. After that, all routing queries read from `street_edges` — no OSMnx or GeoPandas at request time.

---

## Routing Logic

The routing service (`services/routing.py`) does the following on each POST /route request:

1. Load the pre-scored graph from PostGIS as a NetworkX DiGraph (cached in memory on startup with `@lru_cache`)
2. Geocode origin and destination to lat/lng
3. Find nearest graph nodes to each coordinate using OSMnx `nearest_nodes`
4. Run `networkx.shortest_path` with `weight='length'` → Route A (shortest)
5. Run `networkx.shortest_path` with `weight='climate_score'` → Route B (climate-smart)
6. Convert both node sequences to GeoJSON LineStrings
7. Aggregate heat, flood, and canopy stats along each route
8. Return both routes with stats to the router

The graph is loaded once at startup and kept in memory. Do not reload it per request.

---

## LLM Prompt

The prompt sent to the OpenAI API (`gpt-5-mini`) in `services/llm.py`:

```python
SYSTEM_PROMPT = """You are a helpful urban climate assistant. 
You explain pedestrian route tradeoffs clearly and concisely to everyday users.
Focus on practical impact — temperature, shade, flood risk — not technical scores.
Always write in plain English. Two to three sentences maximum."""

def build_user_prompt(shortest: RouteStats, climate: RouteStats) -> str:
    return f"""
Compare these two pedestrian routes in NYC:

Shortest route:
- Distance: {shortest.distance_m}m, ~{shortest.duration_min} min walk
- Heat vulnerability score: {shortest.heat_score}/100 (higher = hotter)
- Flood risk score: {shortest.flood_score}/100 (higher = more risk)
- Tree canopy coverage: {shortest.canopy_pct}%

Climate-smart route:
- Distance: {climate.distance_m}m, ~{climate.duration_min} min walk
- Heat vulnerability score: {climate.heat_score}/100
- Flood risk score: {climate.flood_score}/100
- Tree canopy coverage: {climate.canopy_pct}%

Explain the tradeoff to a pedestrian deciding which route to take.
""".strip()
```

---

## Frontend Map Behavior

The map (`components/RouteMap.tsx`) must implement:

- **Mapbox basemap style:** `mapbox://styles/mapbox/light-v11` — clean, minimal, routes stand out
- **Route A (shortest):** rendered as a `LineLayer` with color `#94a3b8` (slate gray), width 4px
- **Route B (climate-smart):** rendered as a `LineLayer` with color `#22c55e` (green), width 4px, with a subtle animated dash pattern to distinguish it
- **Both routes visible simultaneously** on the same map — no tab switching
- **Toggle switches** in the side panel to show/hide each route independently
- **Hover interaction:** hovering a route segment shows a tooltip with that segment's heat score, flood score, and canopy percentage
- **Fit bounds:** on route load, map automatically fits to show both full routes with 80px padding
- **Side panel:** fixed panel on the right (desktop) or bottom sheet (mobile) showing:
  - Route A stats (distance, time, heat score, canopy)
  - Route B stats (distance, time, heat score, canopy)
  - LLM explanation text
  - Toggle switches
- **Loading state:** while the API request is in flight, show skeleton loaders in the panel and a subtle pulse on the map

---

## Local Development

```bash
# 1. Start PostGIS locally
docker-compose up -d

# 2. Run ingestion scripts (one time only)
cd backend
python scripts/ingest_hvi.py
python scripts/ingest_canopy.py
python scripts/ingest_flood.py
python scripts/precompute_graph.py

# 3. Start FastAPI
uvicorn app.main:app --reload --port 8000

# 4. Start Next.js
cd frontend
npm install
npm run dev
```

---

## Railway Deployment

Two Railway services in one project:

**Service 1 — postgres**
- Use Railway's official PostgreSQL template
- Enable PostGIS by running: `CREATE EXTENSION postgis;` in the Railway shell
- Set `DATABASE_URL` in Service 2's environment variables from Railway's auto-generated connection string

**Service 2 — backend**
- Dockerfile: `backend/Dockerfile`
- Set environment variables: `DATABASE_URL`, `OPENAI_API_KEY`, `ENVIRONMENT=production`
- After first deploy, run ingestion scripts via Railway's shell tab

**Vercel — frontend**
- Connect GitHub repo, set root directory to `frontend/`
- Set environment variables: `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_API_URL` (Railway backend public URL)

---

## CORS Configuration

In `backend/app/main.py`, configure CORS to allow requests from both local dev and production:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-vercel-domain.vercel.app"
    ],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)
```

---

## Code Conventions

- Python: use type hints everywhere, Pydantic v2 models for all request/response schemas, async route handlers in FastAPI
- TypeScript: strict mode enabled, no `any` types, use Zod for API response validation in the frontend
- All geo coordinates are `[longitude, latitude]` (GeoJSON standard) — never swap these
- Climate scores are normalized 0–100 before storage and in the API response
- Distance is always in meters, duration always in minutes
- Comments should explain *why*, not *what*

---

## What Not to Build

- No user accounts or authentication
- No saving or sharing routes
- No real-time weather data (use static pre-ingested climate data only)
- No mobile app — responsive web only
- No turn-by-turn directions — this is a route comparison tool, not a navigation app
- Do not call OSMnx or GeoPandas at request time — all heavy computation happens at ingestion
