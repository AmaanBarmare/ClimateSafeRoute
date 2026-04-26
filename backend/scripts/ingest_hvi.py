"""
Ingests NYC Heat Vulnerability Index (Socrata 4mhf-duep, ZCTA-level rank)
joined with NYC Modified ZCTA polygons (pri4-ifjk) into the climate_hvi table.
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
_DB_URL = os.environ["DATABASE_URL"]
if _DB_URL.startswith("postgres://"):
    _DB_URL = _DB_URL.replace("postgres://", "postgresql://", 1)
engine = create_engine(_DB_URL)


def main() -> None:
    hvi_path = ROOT / "data" / "hvi.json"
    modzcta_path = ROOT / "data" / "modzcta.geojson"

    print(f"Loading HVI ranks from {hvi_path}")
    hvi_rows = json.loads(hvi_path.read_text())
    hvi_df = pd.DataFrame(hvi_rows)
    hvi_df["zcta20"] = hvi_df["zcta20"].astype(str).str.strip()
    hvi_df["hvi"] = pd.to_numeric(hvi_df["hvi"], errors="coerce").fillna(3).astype(int)
    print(f"  {len(hvi_df)} ZCTA HVI ranks loaded")

    print(f"Loading MODZCTA polygons from {modzcta_path}")
    modzcta = gpd.read_file(modzcta_path).to_crs(epsg=4326)
    modzcta["modzcta"] = modzcta["modzcta"].astype(str).str.strip()
    print(f"  {len(modzcta)} MODZCTA polygons loaded")

    merged = modzcta.merge(hvi_df, left_on="modzcta", right_on="zcta20", how="inner")
    print(f"  {len(merged)} ZCTAs after HVI join")

    merged["geometry"] = merged["geometry"].apply(
        lambda g: g if g.geom_type == "MultiPolygon" else MultiPolygon([g])
    )

    out = gpd.GeoDataFrame(
        {
            "nta_code": merged["modzcta"],
            "nta_name": merged.get("label", merged["modzcta"]).astype(str),
            "hvi_rank": merged["hvi"].clip(1, 5).astype(int),
            "geometry": merged["geometry"],
        },
        crs="EPSG:4326",
    )

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE climate_hvi RESTART IDENTITY"))

    out.to_postgis("climate_hvi", engine, if_exists="append", index=False)
    print(f"climate_hvi: {len(out)} rows written")


if __name__ == "__main__":
    main()
