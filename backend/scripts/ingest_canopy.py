"""
Ingests NYC tree-count-per-ZCTA (aggregated server-side from the 2015 Street
Tree Census points, Socrata uvpi-gqnh) joined with MODZCTA polygons
(pri4-ifjk) into the climate_canopy table.

Original spec used per-block canopy_pct polygons. NYC retired that endpoint;
this proxy uses live-tree density per ZCTA — higher tree count per square km
= higher canopy proxy.

canopy_pct is normalized 0-100 by percentile rank across NYC ZCTAs.
"""
import json
import os
from pathlib import Path

import geopandas as gpd
import pandas as pd
from dotenv import load_dotenv
from shapely.geometry import MultiPolygon
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
engine = create_engine(os.environ["DATABASE_URL"])


def main() -> None:
    canopy_path = ROOT / "data" / "canopy.json"
    modzcta_path = ROOT / "data" / "modzcta.geojson"

    print(f"Loading tree counts from {canopy_path}")
    rows = json.loads(canopy_path.read_text())
    trees = pd.DataFrame(rows)
    # Filter junk zipcodes (non-5-digit), keep only valid NYC ZIPs
    trees = trees[trees["zipcode"].astype(str).str.fullmatch(r"\d{5}")].copy()
    trees["zipcode"] = trees["zipcode"].astype(str)
    trees["tree_count"] = pd.to_numeric(trees["count"], errors="coerce").fillna(0).astype(int)
    print(f"  {len(trees)} ZCTAs with valid tree counts")

    print(f"Loading MODZCTA polygons from {modzcta_path}")
    modzcta = gpd.read_file(modzcta_path).to_crs(epsg=4326)
    modzcta["modzcta"] = modzcta["modzcta"].astype(str)

    # Compute area in km^2 using NY State Plane (EPSG:2263, feet)
    modzcta_proj = modzcta.to_crs(epsg=2263)
    modzcta["area_km2"] = (modzcta_proj.geometry.area * 0.3048 * 0.3048) / 1_000_000

    merged = modzcta.merge(trees[["zipcode", "tree_count"]], left_on="modzcta", right_on="zipcode", how="inner")
    print(f"  {len(merged)} MODZCTAs joined to tree counts")

    merged["trees_per_km2"] = merged["tree_count"] / merged["area_km2"]
    # Percentile rank → 0-100 canopy_pct (distribution-aware normalization)
    merged["canopy_pct"] = (merged["trees_per_km2"].rank(pct=True) * 100).round(2)
    print(
        f"  trees_per_km2: min={merged['trees_per_km2'].min():.0f} "
        f"median={merged['trees_per_km2'].median():.0f} max={merged['trees_per_km2'].max():.0f}"
    )
    print(
        f"  canopy_pct (pct-rank): min={merged['canopy_pct'].min():.1f} "
        f"median={merged['canopy_pct'].median():.1f} max={merged['canopy_pct'].max():.1f}"
    )

    merged["geometry"] = merged["geometry"].apply(
        lambda g: g if g.geom_type == "MultiPolygon" else MultiPolygon([g])
    )

    out = gpd.GeoDataFrame(
        {"canopy_pct": merged["canopy_pct"], "geometry": merged["geometry"]},
        crs="EPSG:4326",
    )

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE climate_canopy RESTART IDENTITY"))

    out.to_postgis("climate_canopy", engine, if_exists="append", index=False)
    print(f"climate_canopy: {len(out)} rows written")


if __name__ == "__main__":
    main()
