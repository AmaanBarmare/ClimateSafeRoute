# DATABASE.md — ClimateSafe Route

Complete PostGIS schema, ingestion pipeline, and query reference. Run everything in this file in order before starting the backend for the first time.

---

## Setup

### Local (Docker)

The `docker-compose.yml` at the repo root starts a PostGIS-enabled PostgreSQL instance. After running `docker-compose up -d`, connect and run the schema setup:

```bash
docker exec -it climatesafe-db psql -U postgres -d climatesafe
```

### Railway

After provisioning the Railway PostgreSQL service, open the shell tab and run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

---

## Schema

Run this entire block to create all tables. Run it once. It is idempotent (`IF NOT EXISTS`).

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Heat Vulnerability Index (by NYC Neighborhood Tabulation Area)
CREATE TABLE IF NOT EXISTS climate_hvi (
    id          SERIAL PRIMARY KEY,
    nta_code    VARCHAR(10) NOT NULL,
    nta_name    VARCHAR(100),
    hvi_rank    INTEGER NOT NULL CHECK (hvi_rank BETWEEN 1 AND 5),
    geometry    GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hvi_geometry ON climate_hvi USING GIST (geometry);

-- Tree Canopy Coverage (by block polygon)
CREATE TABLE IF NOT EXISTS climate_canopy (
    id          SERIAL PRIMARY KEY,
    canopy_pct  FLOAT NOT NULL CHECK (canopy_pct BETWEEN 0 AND 100),
    geometry    GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_canopy_geometry ON climate_canopy USING GIST (geometry);

-- FEMA Flood Zones (by polygon designation)
CREATE TABLE IF NOT EXISTS climate_flood (
    id          SERIAL PRIMARY KEY,
    fld_zone    VARCHAR(10) NOT NULL,
    risk_score  FLOAT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    geometry    GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_flood_geometry ON climate_flood USING GIST (geometry);

-- Pre-scored street edges (the main routing table)
CREATE TABLE IF NOT EXISTS street_edges (
    id              BIGSERIAL PRIMARY KEY,
    source_node     BIGINT NOT NULL,
    target_node     BIGINT NOT NULL,
    osm_id          BIGINT,
    name            VARCHAR(200),
    length_m        FLOAT NOT NULL,
    climate_score   FLOAT NOT NULL,     -- composite weight used by routing, 0–1
    heat_score      FLOAT NOT NULL,     -- normalized 0–100
    flood_score     FLOAT NOT NULL,     -- normalized 0–100
    canopy_pct      FLOAT NOT NULL,     -- 0–100 percentage
    geometry        GEOMETRY(LINESTRING, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON street_edges (source_node);
CREATE INDEX IF NOT EXISTS idx_edges_target ON street_edges (target_node);
CREATE INDEX IF NOT EXISTS idx_edges_geometry ON street_edges USING GIST (geometry);
```

---

## Ingestion Scripts

All scripts live in `backend/scripts/`. Run them in order after creating the schema. Each script is idempotent — it truncates the target table before inserting, so safe to re-run.

### scripts/ingest_hvi.py

```python
"""
Loads NYC Heat Vulnerability Index GeoJSON into the climate_hvi table.
Expected input file: backend/data/hvi.geojson
Key fields: nta_code (or NTACode), hvi_rank (or HVI_RANK or score)
"""
import geopandas as gpd
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

def ingest_hvi():
    print("Loading HVI data...")
    gdf = gpd.read_file("data/hvi.geojson")
    
    # Normalize field names to lowercase
    gdf.columns = [c.lower() for c in gdf.columns]
    
    # Ensure correct CRS (EPSG:4326)
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    
    # Identify the HVI rank column (dataset may use different names)
    rank_col = next((c for c in gdf.columns if 'hvi' in c or 'rank' in c), None)
    if not rank_col:
        raise ValueError(f"Cannot find HVI rank column. Available: {list(gdf.columns)}")
    
    nta_col = next((c for c in gdf.columns if 'nta' in c and 'code' in c), None)
    name_col = next((c for c in gdf.columns if 'nta' in c and 'name' in c), None)
    
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE climate_hvi RESTART IDENTITY"))
        for _, row in gdf.iterrows():
            conn.execute(text("""
                INSERT INTO climate_hvi (nta_code, nta_name, hvi_rank, geometry)
                VALUES (:nta_code, :nta_name, :hvi_rank, ST_GeomFromText(:geom, 4326))
            """), {
                "nta_code": str(row.get(nta_col, "")) if nta_col else "",
                "nta_name": str(row.get(name_col, "")) if name_col else "",
                "hvi_rank": int(row[rank_col]),
                "geom": row.geometry.wkt,
            })
        conn.commit()
    
    print(f"HVI ingestion complete: {len(gdf)} neighborhoods")

if __name__ == "__main__":
    ingest_hvi()
```

### scripts/ingest_canopy.py

```python
"""
Loads NYC Tree Canopy GeoJSON into the climate_canopy table.
Expected input file: backend/data/canopy.geojson
Key field: canopy_pct (or CanopyPct or pct_canopy)
"""
import geopandas as gpd
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

def ingest_canopy():
    print("Loading tree canopy data...")
    gdf = gpd.read_file("data/canopy.geojson")
    gdf.columns = [c.lower() for c in gdf.columns]
    
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    
    pct_col = next((c for c in gdf.columns if 'canopy' in c or 'pct' in c), None)
    if not pct_col:
        raise ValueError(f"Cannot find canopy percentage column. Available: {list(gdf.columns)}")
    
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE climate_canopy RESTART IDENTITY"))
        for _, row in gdf.iterrows():
            val = float(row[pct_col])
            # Some datasets use 0–1 scale instead of 0–100 — normalize
            if val <= 1.0:
                val = val * 100
            conn.execute(text("""
                INSERT INTO climate_canopy (canopy_pct, geometry)
                VALUES (:pct, ST_GeomFromText(:geom, 4326))
            """), {"pct": round(val, 2), "geom": row.geometry.wkt})
        conn.commit()
    
    print(f"Canopy ingestion complete: {len(gdf)} polygons")

if __name__ == "__main__":
    ingest_canopy()
```

### scripts/ingest_flood.py

```python
"""
Loads FEMA Flood Zone GeoJSON into the climate_flood table.
Expected input file: backend/data/flood.geojson
Key field: fld_zone (or FLD_ZONE or flood_zone)
"""
import geopandas as gpd
from sqlalchemy import create_engine, text
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

FLOOD_ZONE_SCORES = {
    "VE": 95, "AE": 80, "AO": 70, "AH": 65,
    "A": 60, "X": 20, "D": 10,
}
DEFAULT_FLOOD_SCORE = 5

def ingest_flood():
    print("Loading FEMA flood zone data...")
    gdf = gpd.read_file("data/flood.geojson")
    gdf.columns = [c.lower() for c in gdf.columns]
    
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        gdf = gdf.to_crs(epsg=4326)
    
    zone_col = next((c for c in gdf.columns if 'fld_zone' in c or 'flood_zone' in c or 'zone' in c), None)
    if not zone_col:
        raise ValueError(f"Cannot find flood zone column. Available: {list(gdf.columns)}")
    
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE climate_flood RESTART IDENTITY"))
        for _, row in gdf.iterrows():
            zone = str(row[zone_col]).strip().upper()
            score = FLOOD_ZONE_SCORES.get(zone, DEFAULT_FLOOD_SCORE)
            conn.execute(text("""
                INSERT INTO climate_flood (fld_zone, risk_score, geometry)
                VALUES (:zone, :score, ST_GeomFromText(:geom, 4326))
            """), {"zone": zone, "score": score, "geom": row.geometry.wkt})
        conn.commit()
    
    print(f"Flood ingestion complete: {len(gdf)} polygons")

if __name__ == "__main__":
    ingest_flood()
```

### scripts/precompute_graph.py

This is the most important script. It pulls the NYC street network, attaches all three climate layers to every street edge via spatial joins, computes a composite climate score, and stores the result in `street_edges`. Run this last, after all three climate tables are populated.

Expected runtime: 5–15 minutes depending on machine. Processes approximately 200,000–400,000 edges for Manhattan + Brooklyn.

```python
"""
Precomputes the climate-scored street graph for Manhattan.
(Brooklyn is added after Manhattan works end-to-end — extend PLACE_QUERY then re-run.)
Reads from climate_hvi, climate_canopy, climate_flood tables.
Writes scored edges to street_edges table.
Run once after all climate data is ingested.
"""
import osmnx as ox
import geopandas as gpd
import pandas as pd
import networkx as nx
from sqlalchemy import create_engine, text
from shapely.geometry import LineString
import numpy as np
import os

DATABASE_URL = os.environ["DATABASE_URL"]
engine = create_engine(DATABASE_URL)

# NYC boroughs to include. Manhattan only for first build; add Brooklyn after end-to-end works.
PLACE_QUERY = ["Manhattan, New York, USA"]

def load_climate_layers() -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """Load all three climate tables from PostGIS as GeoDataFrames."""
    print("Loading climate layers from PostGIS...")
    hvi = gpd.read_postgis("SELECT hvi_rank, geometry FROM climate_hvi", engine, geom_col="geometry")
    canopy = gpd.read_postgis("SELECT canopy_pct, geometry FROM climate_canopy", engine, geom_col="geometry")
    flood = gpd.read_postgis("SELECT risk_score, geometry FROM climate_flood", engine, geom_col="geometry")
    print(f"  HVI: {len(hvi)} features, Canopy: {len(canopy)} features, Flood: {len(flood)} features")
    return hvi, canopy, flood

def pull_street_network() -> gpd.GeoDataFrame:
    """Pull pedestrian street network from OSMnx and return as edge GeoDataFrame."""
    print("Pulling street network from OpenStreetMap...")
    G = ox.graph_from_place(
        PLACE_QUERY,
        network_type="walk",
        retain_all=False,
        simplify=True,
    )
    print(f"  Nodes: {G.number_of_nodes()}, Edges: {G.number_of_edges()}")
    
    # Convert to GeoDataFrame of edges
    _, edges = ox.graph_to_gdfs(G)
    edges = edges.reset_index()  # brings u, v, key into columns
    edges = edges.rename(columns={"u": "source_node", "v": "target_node"})
    edges = edges[["source_node", "target_node", "osmid", "name", "length", "geometry"]].copy()
    edges = edges.rename(columns={"osmid": "osm_id", "length": "length_m"})
    edges["name"] = edges["name"].apply(lambda x: str(x) if isinstance(x, list) else x)
    
    return edges

def attach_climate_scores(
    edges: gpd.GeoDataFrame,
    hvi: gpd.GeoDataFrame,
    canopy: gpd.GeoDataFrame,
    flood: gpd.GeoDataFrame,
) -> gpd.GeoDataFrame:
    """
    Spatial join all three climate layers onto edge midpoints.
    Uses the midpoint of each edge LineString as the join geometry for speed.
    Fills missing values with borough medians.
    """
    print("Computing edge midpoints for spatial join...")
    edges_proj = edges.copy()
    edges_proj["midpoint"] = edges_proj.geometry.interpolate(0.5, normalized=True)
    midpoints = gpd.GeoDataFrame(edges_proj[["source_node", "target_node"]], geometry=edges_proj["midpoint"], crs="EPSG:4326")
    
    print("Spatial join: HVI...")
    hvi_join = gpd.sjoin(midpoints, hvi[["hvi_rank", "geometry"]], how="left", predicate="within")
    edges_proj["hvi_rank"] = hvi_join["hvi_rank"].values
    
    print("Spatial join: Tree canopy...")
    canopy_join = gpd.sjoin(midpoints, canopy[["canopy_pct", "geometry"]], how="left", predicate="within")
    edges_proj["canopy_pct"] = canopy_join["canopy_pct"].values
    
    print("Spatial join: Flood zones...")
    flood_join = gpd.sjoin(midpoints, flood[["risk_score", "geometry"]], how="left", predicate="within")
    edges_proj["flood_score_raw"] = flood_join["risk_score"].values
    
    # Fill missing values with medians
    edges_proj["hvi_rank"] = edges_proj["hvi_rank"].fillna(edges_proj["hvi_rank"].median())
    edges_proj["canopy_pct"] = edges_proj["canopy_pct"].fillna(edges_proj["canopy_pct"].median())
    edges_proj["flood_score_raw"] = edges_proj["flood_score_raw"].fillna(5.0)  # default: minimal risk
    
    # Normalize HVI to 0–100 scale (original is 1–5)
    edges_proj["heat_score"] = ((edges_proj["hvi_rank"] - 1) / 4.0 * 100).round(2)
    edges_proj["flood_score"] = edges_proj["flood_score_raw"].round(2)
    
    # Composite climate score (0–1 scale for use as routing edge weight)
    # Higher score = more climate risk = routing avoids this edge
    hvi_norm = (edges_proj["hvi_rank"] - 1) / 4.0
    flood_norm = edges_proj["flood_score_raw"] / 100.0
    canopy_norm = edges_proj["canopy_pct"] / 100.0
    
    # Add 1.0 as a baseline so climate_score is always ≥ length
    # This prevents routing from ignoring distance entirely
    edges_proj["climate_score"] = (
        edges_proj["length_m"] * (
            1.0 +
            (hvi_norm * 0.5) +
            (flood_norm * 0.3) +
            ((1 - canopy_norm) * 0.2)
        )
    ).round(4)
    
    return edges_proj

def write_to_postgis(edges: gpd.GeoDataFrame) -> None:
    """Write all scored edges to the street_edges table."""
    print(f"Writing {len(edges)} edges to PostGIS...")
    
    with engine.connect() as conn:
        conn.execute(text("TRUNCATE TABLE street_edges RESTART IDENTITY"))
        conn.commit()
    
    # Write in batches of 10,000 for performance
    batch_size = 10_000
    total = len(edges)
    
    for i in range(0, total, batch_size):
        batch = edges.iloc[i:i+batch_size]
        records = []
        for _, row in batch.iterrows():
            records.append({
                "source_node": int(row["source_node"]),
                "target_node": int(row["target_node"]),
                "osm_id": int(row["osm_id"]) if pd.notna(row.get("osm_id")) else None,
                "name": str(row["name"]) if pd.notna(row.get("name")) else None,
                "length_m": float(row["length_m"]),
                "climate_score": float(row["climate_score"]),
                "heat_score": float(row["heat_score"]),
                "flood_score": float(row["flood_score"]),
                "canopy_pct": float(row["canopy_pct"]),
                "geom": row["geometry"].wkt,
            })
        
        with engine.connect() as conn:
            conn.execute(text("""
                INSERT INTO street_edges 
                    (source_node, target_node, osm_id, name, length_m, 
                     climate_score, heat_score, flood_score, canopy_pct, geometry)
                VALUES 
                    (:source_node, :target_node, :osm_id, :name, :length_m,
                     :climate_score, :heat_score, :flood_score, :canopy_pct,
                     ST_GeomFromText(:geom, 4326))
            """), records)
            conn.commit()
        
        print(f"  Written {min(i+batch_size, total)}/{total} edges")
    
    print("Write complete.")

if __name__ == "__main__":
    hvi, canopy, flood = load_climate_layers()
    edges = pull_street_network()
    edges_scored = attach_climate_scores(edges, hvi, canopy, flood)
    write_to_postgis(edges_scored)
    print("\nPrecomputation complete. Backend is ready to start.")
```

---

## Useful Queries

Run these directly in psql or the Railway shell to verify data.

```sql
-- Check row counts
SELECT 'climate_hvi' AS tbl, COUNT(*) FROM climate_hvi
UNION ALL SELECT 'climate_canopy', COUNT(*) FROM climate_canopy
UNION ALL SELECT 'climate_flood', COUNT(*) FROM climate_flood
UNION ALL SELECT 'street_edges', COUNT(*) FROM street_edges;

-- Sample heat score distribution in street_edges
SELECT
    ROUND(heat_score / 10) * 10 AS bucket,
    COUNT(*) AS edges
FROM street_edges
GROUP BY bucket
ORDER BY bucket;

-- Verify spatial coverage: check bounding box of street edges
SELECT ST_Extent(geometry) FROM street_edges;
-- Should return something like BOX(-74.05 40.57,-73.83 40.88)

-- Find edges with no canopy data (should be near zero after fillna)
SELECT COUNT(*) FROM street_edges WHERE canopy_pct = 0;

-- Spot check a specific area (Times Square vicinity)
SELECT source_node, target_node, heat_score, flood_score, canopy_pct, climate_score
FROM street_edges
WHERE ST_DWithin(
    geometry,
    ST_SetSRID(ST_MakePoint(-73.9857, 40.7580), 4326),
    0.005  -- ~500m in degrees
)
LIMIT 10;
```

---

## Re-ingestion

To refresh climate data (e.g. when NYC publishes an updated HVI dataset):

1. Download the new dataset to `backend/data/`
2. Re-run the corresponding ingestion script (it truncates before inserting)
3. Re-run `precompute_graph.py` to recompute edge scores
4. Restart the FastAPI backend (the in-memory graph reloads on startup)

The street network itself (OSMnx) rarely needs refreshing unless major street changes occur.
