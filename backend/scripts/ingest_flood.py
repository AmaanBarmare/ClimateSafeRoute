"""
Ingests NYC Flood Vulnerability Index (Socrata mrjc-v9pm, census-tract level,
FSHRI rank 1-5) into the climate_flood table.

The original spec used FEMA flood zones (AE/VE/X). NYC retired that endpoint;
this dataset uses the FSHRI scale instead. We store FSHRI as the zone label
and derive risk_score = FSHRI * 20 (so 1 -> 20, 5 -> 100).
"""
import os
from pathlib import Path

import geopandas as gpd
from dotenv import load_dotenv
from shapely.geometry import MultiPolygon
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
_DB_URL = os.environ["DATABASE_URL"]
if _DB_URL.startswith("postgres://"):
    _DB_URL = _DB_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(_DB_URL)


def main() -> None:
    flood_path = ROOT / "data" / "flood.geojson"
    print(f"Loading FVI tracts from {flood_path}")

    gdf = gpd.read_file(flood_path).to_crs(epsg=4326)
    gdf.columns = [c.lower() for c in gdf.columns]
    print(f"  {len(gdf)} tracts loaded; columns: {list(gdf.columns)}")

    fshri_col = next((c for c in gdf.columns if c == "fshri"), None)
    if not fshri_col:
        raise ValueError(f"No FSHRI column. Available: {list(gdf.columns)}")

    before = len(gdf)
    gdf = gdf[gdf[fshri_col].notna()].copy()
    gdf[fshri_col] = gdf[fshri_col].astype(int)
    print(f"  {len(gdf)}/{before} tracts with valid FSHRI")

    gdf["geometry"] = gdf["geometry"].apply(
        lambda g: g if g.geom_type == "MultiPolygon" else MultiPolygon([g])
    )

    out = gpd.GeoDataFrame(
        {
            "fld_zone": gdf[fshri_col].astype(str),
            "risk_score": (gdf[fshri_col] * 20).clip(0, 100).astype(float),
            "geometry": gdf["geometry"],
        },
        crs="EPSG:4326",
    )

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE climate_flood RESTART IDENTITY"))

    out.to_postgis("climate_flood", engine, if_exists="append", index=False)
    print(f"climate_flood: {len(out)} rows written")


if __name__ == "__main__":
    main()
