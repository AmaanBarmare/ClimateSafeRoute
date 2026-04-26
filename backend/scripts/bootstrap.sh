#!/usr/bin/env bash
# One-shot Railway bootstrap: schema + data download + ingestion + precompute.
# Run from /app inside the Railway backend service shell:
#     bash scripts/bootstrap.sh
#
# Idempotent: re-running is safe (TRUNCATE + reload).

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
    echo "ERROR: DATABASE_URL is not set." >&2
    exit 1
fi

cd "$(dirname "$0")/.."

mkdir -p data

echo "==> 1/6  Apply PostGIS schema"
python scripts/apply_schema.py

echo "==> 2/6  Download NYC climate datasets"
curl -fsSL 'https://data.cityofnewyork.us/resource/4mhf-duep.json?$limit=500' \
    -o data/hvi.json
curl -fsSL 'https://data.cityofnewyork.us/resource/pri4-ifjk.geojson?$limit=500' \
    -o data/modzcta.geojson
curl -fsSL 'https://data.cityofnewyork.us/api/geospatial/mrjc-v9pm?method=export&format=GeoJSON' \
    -o data/flood.geojson
curl -fsSL "https://data.cityofnewyork.us/resource/uvpi-gqnh.json?\$select=zipcode,count(*)&\$group=zipcode&\$where=status='Alive'&\$limit=5000" \
    -o data/canopy.json

echo "==> 3/6  Ingest HVI"
python scripts/ingest_hvi.py

echo "==> 4/6  Ingest Flood (FVI)"
python scripts/ingest_flood.py

echo "==> 5/6  Ingest Canopy (tree counts)"
python scripts/ingest_canopy.py

echo "==> 6/6  Precompute climate-scored Manhattan street graph"
python scripts/precompute_graph.py

echo
echo "Bootstrap complete. Restart the backend service so it loads the graph from PostGIS."
