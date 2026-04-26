"""
Ingests NYC 2015 Street Tree Census Blockface (Socrata 2cd9-59fr) aggregated
to NYC Modified ZCTAs (pri4-ifjk) into the climate_canopy table.

The original spec used per-block canopy_pct polygons. NYC retired that
dataset; we substitute tree-density per ZCTA as a proxy.

canopy_pct is normalized: trees-per-km / 2.0, clipped 0-100.
(Roughly 200 trees/km of street -> 100% canopy proxy.)
"""
import os
from pathlib import Path

import geopandas as gpd
from dotenv import load_dotenv
from shapely.geometry import MultiPolygon
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
engine = create_engine(os.environ["DATABASE_URL"])


def main() -> None:
    canopy_path = ROOT / "data" / "canopy.geojson"
    modzcta_path = ROOT / "data" / "modzcta.geojson"

    print(f"Loading tree census blockfaces from {canopy_path}")
    blocks = gpd.read_file(canopy_path).to_crs(epsg=4326)
    blocks.columns = [c.lower() for c in blocks.columns]
    print(f"  {len(blocks)} blockfaces; columns: {list(blocks.columns)[:20]}")

    cnt_col = next(
        (c for c in blocks.columns if "cnt" in c or "count" in c or c == "trees"),
        None,
    )
    if not cnt_col:
        raise ValueError(f"No tree-count column. Available: {list(blocks.columns)}")
    print(f"  Tree-count column: {cnt_col}")

    blocks[cnt_col] = blocks[cnt_col].fillna(0).astype(float)

    print(f"Loading MODZCTA polygons from {modzcta_path}")
    modzcta = gpd.read_file(modzcta_path).to_crs(epsg=4326)
    modzcta["modzcta"] = modzcta["modzcta"].astype(str)

    print("Computing blockface centroids and joining to MODZCTAs...")
    centroids = blocks.copy()
    centroids["geometry"] = centroids.geometry.centroid
    joined = gpd.sjoin(
        centroids[["geometry", cnt_col]],
        modzcta[["modzcta", "geometry"]],
        how="left",
        predicate="within",
    )
    matched = joined["modzcta"].notna().sum()
    print(f"  {matched}/{len(blocks)} blockfaces matched to a MODZCTA")

    print("Computing blockface lengths in meters (NY State Plane EPSG:2263)...")
    blocks_proj = blocks.to_crs(epsg=2263)
    blocks_proj["length_m"] = blocks_proj.geometry.length * 0.3048
    blocks_proj["modzcta"] = joined["modzcta"].values

    agg = (
        blocks_proj.groupby("modzcta")
        .agg(total_trees=(cnt_col, "sum"), total_length_m=("length_m", "sum"))
        .reset_index()
    )
    agg = agg[agg["total_length_m"] > 0]
    agg["trees_per_km"] = agg["total_trees"] / (agg["total_length_m"] / 1000.0)
    agg["canopy_pct"] = (agg["trees_per_km"] / 2.0).clip(0, 100).round(2)
    print(
        f"  ZCTAs with data: {len(agg)} | "
        f"canopy_pct min={agg['canopy_pct'].min():.1f} "
        f"median={agg['canopy_pct'].median():.1f} max={agg['canopy_pct'].max():.1f}"
    )

    out = modzcta.merge(agg[["modzcta", "canopy_pct"]], on="modzcta", how="inner")
    out["geometry"] = out["geometry"].apply(
        lambda g: g if g.geom_type == "MultiPolygon" else MultiPolygon([g])
    )

    out_gdf = gpd.GeoDataFrame(
        {"canopy_pct": out["canopy_pct"], "geometry": out["geometry"]},
        crs="EPSG:4326",
    )

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE climate_canopy RESTART IDENTITY"))

    out_gdf.to_postgis("climate_canopy", engine, if_exists="append", index=False)
    print(f"climate_canopy: {len(out_gdf)} rows written")


if __name__ == "__main__":
    main()
