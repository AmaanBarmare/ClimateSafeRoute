# DATAFLOW.md — ClimateSafe Route

Complete request and response lifecycle from user keystroke to rendered map. Every transformation, data format, and hand-off point is documented here. Use this file when debugging unexpected behavior — it tells you exactly what should be in each variable at each step.

---

## Complete Request Flow

```
User types addresses → SearchBar → Next.js router → map/page.tsx (Server Component)
→ fetchRoute() → FastAPI POST /route
→ geocode(origin) → Nominatim API → (lng, lat)
→ geocode(destination) → Nominatim API → (lng, lat)
→ compute_routes(origin_coords, destination_coords)
  → get_graph() [from memory]
  → ox.nearest_nodes() → origin_node_id, dest_node_id
  → nx.shortest_path(weight='length') → [node_ids]
  → nx.shortest_path(weight='climate_score') → [node_ids]
  → _path_to_route_stats() × 2 → RouteStats × 2
→ generate_explanation(route_shortest, route_climate)
  → OpenAI API (gpt-5-mini) → explanation string
→ RouteResponse JSON → Next.js
→ RouteMap renders GeoJSON on Mapbox
→ RoutePanel renders stats + explanation
```

---

## Data at Each Stage

### Stage 1 — User Input (Browser)

```typescript
// What SearchBar collects
origin: string      = "Times Square, New York, NY"
destination: string = "Brooklyn Bridge, New York, NY"

// What gets pushed to the URL
/map?origin=Times%20Square%2C%20New%20York%2C%20NY&destination=Brooklyn%20Bridge%2C%20New%20York%2C%20NY
```

---

### Stage 2 — Next.js Server Component reads searchParams

```typescript
// In app/map/page.tsx
const origin = searchParams.origin      // "Times Square, New York, NY"
const destination = searchParams.destination  // "Brooklyn Bridge, New York, NY"

// Calls:
const data = await fetchRoute(origin, destination)
// data is RouteResponse | throws Error
```

---

### Stage 3 — FastAPI receives POST /route

```python
# Request body parsed by Pydantic
request.origin      = "Times Square, New York, NY"
request.destination = "Brooklyn Bridge, New York, NY"
```

---

### Stage 4 — Geocoding

```python
# geocode("Times Square, New York, NY")
# → Nominatim query: "Times Square, New York, NY" (already has NYC)
# → HTTP GET https://nominatim.openstreetmap.org/search?q=Times+Square...
# → Response: [{"lat": "40.7580", "lon": "-73.9857", ...}]
# → Returns:

origin_coords = (-73.9857, 40.7580)  # (lng, lat) — ALWAYS this order

# geocode("Brooklyn Bridge, New York, NY")
destination_coords = (-73.9969, 40.7061)
```

**Critical:** Coordinates are always `(longitude, latitude)` — GeoJSON standard. Nominatim returns them as separate `lon` and `lat` fields. Extract `lon` first.

---

### Stage 5 — Graph loading (happens once at startup, not per request)

```python
# load_graph_on_startup() runs this SQL:
SELECT source_node, target_node, length_m, climate_score,
       heat_score, flood_score, canopy_pct, geometry
FROM street_edges

# Builds a NetworkX DiGraph where:
# - Nodes are OSM node IDs (integers, e.g. 42439178)
# - Edges have attributes:
G[42439178][42439179] = {
    'length': 87.3,           # meters
    'climate_score': 142.6,   # composite (length × risk multiplier)
    'heat_score': 72.0,       # 0–100
    'flood_score': 5.0,       # 0–100
    'canopy_pct': 4.0,        # percent
    'geometry': <LineString>  # shapely object
}
```

---

### Stage 6 — Nearest node lookup

```python
# ox.nearest_nodes(G, X=lng, Y=lat)
# X = longitude, Y = latitude — never swap these

origin_node = ox.nearest_nodes(G, X=-73.9857, Y=40.7580)
# → 42439178  (some OSM node ID near Times Square)

dest_node = ox.nearest_nodes(G, X=-73.9969, Y=40.7061)
# → 61734221  (some OSM node ID near Brooklyn Bridge)
```

---

### Stage 7 — Routing

```python
# Route A: minimize total edge 'length'
path_shortest = nx.shortest_path(G, 42439178, 61734221, weight='length')
# → [42439178, 55213344, 61823921, ..., 61734221]
# A list of 50–200 node IDs

# Route B: minimize total edge 'climate_score'
path_climate = nx.shortest_path(G, 42439178, 61734221, weight='climate_score')
# → [42439178, 77821923, 43211234, ..., 61734221]
# A different list — fewer high-heat edges
```

---

### Stage 8 — Path to RouteStats conversion

```python
# _path_to_route_stats(G, path_shortest)

# Iterates over consecutive node pairs (u, v) in the path:
# For each edge G[u][v]:
#   - Appends edge geometry coordinates to the running list
#   - Accumulates length_m
#   - Collects heat_score, flood_score, canopy_pct per edge

# Output:
RouteStats(
    geojson={
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-73.9857, 40.7580],   # origin
                [-73.9855, 40.7572],   # intermediate points
                ...
                [-73.9969, 40.7061]    # destination
            ]
        },
        "properties": {}
    },
    distance_m=4200.0,
    duration_min=50.6,       # 4200 / 83.0
    heat_score=78.3,         # mean across all edges
    flood_score=11.7,
    canopy_pct=7.9
)
```

---

### Stage 9 — LLM call

```python
# Input to OpenAI gpt-5-mini:
system = "You are a helpful urban climate assistant..."
user = """
Compare these two pedestrian routes in NYC:

Shortest route:
- Walking time: 51 minutes (4200m)
- Heat vulnerability score: 78/100
- Flood risk score: 12/100
- Tree canopy coverage: 8%

Climate-smart route:
- Walking time: 57 minutes (4750m)
- Heat vulnerability score: 42/100
- Flood risk score: 3/100
- Tree canopy coverage: 31%

Explain the tradeoff to a pedestrian deciding which route to take. Be specific.
"""

# OpenAI response (gpt-5-mini, max_completion_tokens=200):
explanation = "The climate-smart route adds 6 minutes but cuts your heat exposure nearly in half, routing you through streets with 31% tree canopy cover instead of just 8%. It also avoids flood-prone areas entirely, making it the better choice on hot or rainy days."
```

---

### Stage 10 — JSON response leaves FastAPI

```json
{
  "route_shortest": {
    "geojson": {
      "type": "Feature",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-73.9857, 40.758], [-73.9855, 40.7572], "..."]
      },
      "properties": {}
    },
    "distance_m": 4200.0,
    "duration_min": 50.6,
    "heat_score": 78.3,
    "flood_score": 11.7,
    "canopy_pct": 7.9
  },
  "route_climate": {
    "geojson": { "..." },
    "distance_m": 4750.0,
    "duration_min": 57.2,
    "heat_score": 42.1,
    "flood_score": 3.0,
    "canopy_pct": 31.4
  },
  "explanation": "The climate-smart route adds 6 minutes but cuts your heat exposure nearly in half...",
  "origin_coords": [-73.9857, 40.758],
  "destination_coords": [-73.9969, 40.7061]
}
```

---

### Stage 11 — Next.js receives and passes to components

```typescript
// fetchRoute() returns RouteResponse
// Server Component passes to client components as props:

<RouteMap
  routeShortest={data.route_shortest}
  routeClimate={data.route_climate}
  showShortest={true}
  showClimate={true}
  originCoords={data.origin_coords}
  destinationCoords={data.destination_coords}
/>

<RoutePanel
  routeShortest={data.route_shortest}
  routeClimate={data.route_climate}
  explanation={data.explanation}
  isLoading={false}
  ...
/>
```

---

### Stage 12 — Mapbox renders the routes

```typescript
// RouteLayer for Route A (shortest):
<Source id="route-shortest" type="geojson" data={routeShortest.geojson}>
  <Layer
    id="route-shortest-line"
    type="line"
    paint={{
      'line-color': '#94a3b8',
      'line-width': 4,
      'line-opacity': 0.8,
    }}
  />
</Source>

// RouteLayer for Route B (climate):
<Source id="route-climate" type="geojson" data={routeClimate.geojson}>
  <Layer
    id="route-climate-line"
    type="line"
    paint={{
      'line-color': '#22c55e',
      'line-width': 4,
      'line-opacity': 0.9,
      'line-dasharray': [2, 1],
    }}
  />
</Source>

// Map auto-fits to show both routes:
const bounds = new mapboxgl.LngLatBounds()
routeShortest.geojson.geometry.coordinates.forEach(c => bounds.extend(c))
routeClimate.geojson.geometry.coordinates.forEach(c => bounds.extend(c))
map.fitBounds(bounds, { padding: 80 })
```

---

## Common Data Bugs and How to Catch Them

| Bug | Symptom | Root cause | Fix |
|---|---|---|---|
| Routes appear in ocean | Map shows lines in Gulf of Guinea | Latitude and longitude are swapped somewhere | Check: Nominatim returns `lon` then `lat`; ox.nearest_nodes takes `X=lng, Y=lat`; GeoJSON coords are `[lng, lat]` |
| Route is a straight line | Single straight line on map | Only start and end coordinates, no intermediate edges | `_path_to_route_stats` geometry loop is broken — check coordinate deduplication logic |
| Both routes are identical | Green and gray lines overlap perfectly | `weight` parameter not being passed to `nx.shortest_path` | Verify the second call uses `weight='climate_score'` not `weight='length'` |
| Heat scores all 50 | Every edge has heat_score=50 | HVI spatial join failed silently | Check HVI table has rows; check geometry CRS is EPSG:4326 |
| LLM explanation is always the fallback | OpenAI API never called | `OPENAI_API_KEY` not set in environment | Verify env var is set; check for exception in logs |
| Routing takes >30 seconds | Very slow response | Graph not in memory (loaded per request) | Ensure `load_graph_on_startup()` ran; `get_graph()` returns the cached graph |
