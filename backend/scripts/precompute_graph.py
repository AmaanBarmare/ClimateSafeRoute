"""
Precomputes the climate-scored street graph for Manhattan.
(Brooklyn is added after Manhattan works end-to-end — extend PLACE_QUERY then re-run.)

Reads from climate_hvi, climate_canopy, climate_flood tables.
Writes scored edges to street_edges table.
Run once after all climate data is ingested.
"""
import os
from pathlib import Path

import geopandas as gpd
import osmnx as ox
import pandas as pd
from dotenv import load_dotenv
from shapely.geometry import LineString, MultiLineString
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
engine = create_engine(os.environ["DATABASE_URL"])

# Manhattan only for first build; add Brooklyn after end-to-end works.
PLACE_QUERY = ["Manhattan, New York, USA"]

DEFAULT_FLOOD_SCORE = 20.0  # FSHRI=1 equivalent (low risk) for edges outside any tract


def load_climate_layers() -> tuple[gpd.GeoDataFrame, gpd.GeoDataFrame, gpd.GeoDataFrame]:
    """Load all three climate tables from PostGIS as GeoDataFrames."""
    print("Loading climate layers from PostGIS...")
    hvi = gpd.read_postgis(
        "SELECT hvi_rank, geometry FROM climate_hvi", engine, geom_col="geometry"
    )
    canopy = gpd.read_postgis(
        "SELECT canopy_pct, geometry FROM climate_canopy", engine, geom_col="geometry"
    )
    flood = gpd.read_postgis(
        "SELECT risk_score, geometry FROM climate_flood", engine, geom_col="geometry"
    )
    print(f"  HVI: {len(hvi)} | Canopy: {len(canopy)} | Flood: {len(flood)}")
    return hvi, canopy, flood


def _flatten(value):
    """OSMnx sometimes stores name/osmid as a list when edges are merged in simplification."""
    if isinstance(value, list):
        return value[0] if value else None
    return value


def pull_street_network() -> gpd.GeoDataFrame:
    """Pull pedestrian street network from OSMnx and return as edge GeoDataFrame."""
    print(f"Pulling street network for {PLACE_QUERY}...")
    G = ox.graph_from_place(
        PLACE_QUERY,
        network_type="walk",
        retain_all=False,
        simplify=True,
    )
    print(f"  Graph nodes: {G.number_of_nodes()} | edges: {G.number_of_edges()}")

    _, edges = ox.graph_to_gdfs(G)
    edges = edges.reset_index()  # brings u, v, key into columns
    edges = edges.rename(
        columns={"u": "source_node", "v": "target_node", "osmid": "osm_id", "length": "length_m"}
    )
    edges = edges[["source_node", "target_node", "osm_id", "name", "length_m", "geometry"]].copy()

    edges["osm_id"] = edges["osm_id"].apply(_flatten)
    edges["osm_id"] = pd.to_numeric(edges["osm_id"], errors="coerce")

    def _safe_name(v):
        if isinstance(v, list):
            v = v[0] if v else None
        if v is None or (isinstance(v, float) and pd.isna(v)):
            return None
        return str(v)[:200]

    edges["name"] = edges["name"].apply(_safe_name)

    # Ensure pure LineString geometry (some edges may be MultiLineString after simplification)
    edges["geometry"] = edges["geometry"].apply(
        lambda g: list(g.geoms)[0] if isinstance(g, MultiLineString) else g
    )
    edges = edges[edges.geometry.apply(lambda g: isinstance(g, LineString))].copy()
    print(f"  Edges as clean LineStrings: {len(edges)}")
    return edges


def attach_climate_scores(
    edges: gpd.GeoDataFrame,
    hvi: gpd.GeoDataFrame,
    canopy: gpd.GeoDataFrame,
    flood: gpd.GeoDataFrame,
) -> gpd.GeoDataFrame:
    """Spatial-join climate layers onto edge midpoints."""
    print("Computing edge midpoints...")
    edges = edges.copy().reset_index(drop=True)
    midpoints = gpd.GeoDataFrame(
        {"_idx": edges.index},
        geometry=edges.geometry.interpolate(0.5, normalized=True),
        crs="EPSG:4326",
    )

    def _join(label: str, layer: gpd.GeoDataFrame, value_col: str) -> pd.Series:
        print(f"  Spatial join: {label}")
        joined = gpd.sjoin(midpoints, layer[[value_col, "geometry"]], how="left", predicate="within")
        # If a midpoint falls in multiple polygons, keep the first match per edge
        joined = joined.drop_duplicates(subset="_idx", keep="first").set_index("_idx").sort_index()
        return joined[value_col]

    edges["hvi_rank"] = _join("HVI", hvi, "hvi_rank").values
    edges["canopy_pct"] = _join("Canopy", canopy, "canopy_pct").values
    edges["flood_raw"] = _join("Flood", flood, "risk_score").values

    # Fill missing with sensible defaults (median for HVI/canopy; low risk for flood)
    edges["hvi_rank"] = edges["hvi_rank"].fillna(edges["hvi_rank"].median()).astype(float)
    edges["canopy_pct"] = edges["canopy_pct"].fillna(edges["canopy_pct"].median()).astype(float)
    edges["flood_raw"] = edges["flood_raw"].fillna(DEFAULT_FLOOD_SCORE).astype(float)

    # Public scores (0-100)
    edges["heat_score"] = ((edges["hvi_rank"] - 1) / 4.0 * 100).round(2)
    edges["flood_score"] = edges["flood_raw"].round(2)

    # Composite climate_score = length × (1 + risk multiplier).
    # The +1 baseline keeps distance meaningful so routing doesn't ignore length entirely.
    hvi_norm = (edges["hvi_rank"] - 1) / 4.0
    flood_norm = edges["flood_raw"] / 100.0
    canopy_norm = edges["canopy_pct"] / 100.0
    edges["climate_score"] = (
        edges["length_m"]
        * (1.0 + (hvi_norm * 0.5) + (flood_norm * 0.3) + ((1 - canopy_norm) * 0.2))
    ).round(4)

    print(
        f"  heat_score: min={edges['heat_score'].min():.0f} median={edges['heat_score'].median():.0f} max={edges['heat_score'].max():.0f}"
    )
    print(
        f"  flood_score: min={edges['flood_score'].min():.0f} median={edges['flood_score'].median():.0f} max={edges['flood_score'].max():.0f}"
    )
    print(
        f"  canopy_pct: min={edges['canopy_pct'].min():.0f} median={edges['canopy_pct'].median():.0f} max={edges['canopy_pct'].max():.0f}"
    )
    return edges


def write_to_postgis(edges: gpd.GeoDataFrame) -> None:
    """Write all scored edges to the street_edges table."""
    print(f"Writing {len(edges)} edges to PostGIS...")

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE street_edges RESTART IDENTITY"))

    out = gpd.GeoDataFrame(
        {
            "source_node": edges["source_node"].astype("int64"),
            "target_node": edges["target_node"].astype("int64"),
            "osm_id": edges["osm_id"].astype("Int64"),
            "name": edges["name"],
            "length_m": edges["length_m"].astype(float),
            "climate_score": edges["climate_score"].astype(float),
            "heat_score": edges["heat_score"].astype(float),
            "flood_score": edges["flood_score"].astype(float),
            "canopy_pct": edges["canopy_pct"].astype(float),
            "geometry": edges["geometry"],
        },
        crs="EPSG:4326",
    )

    out.to_postgis("street_edges", engine, if_exists="append", index=False, chunksize=10_000)
    print(f"Wrote {len(out)} edges to street_edges")


if __name__ == "__main__":
    hvi, canopy, flood = load_climate_layers()
    edges = pull_street_network()
    edges = attach_climate_scores(edges, hvi, canopy, flood)
    write_to_postgis(edges)
    print("\nPrecomputation complete. Backend is ready to start.")
