-- ClimateSafe Route — PostGIS schema
-- Idempotent: safe to re-run.
-- Apply locally: docker exec -i climatesafe-db psql -U postgres -d climatesafe < backend/scripts/schema.sql
-- (Local Postgres host port is 5433 to avoid conflict with any host Postgres on 5432.)
-- Apply on Railway: paste into the Postgres service shell.

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
    climate_score   FLOAT NOT NULL,     -- composite weight used by routing
    heat_score      FLOAT NOT NULL,     -- normalized 0–100
    flood_score     FLOAT NOT NULL,     -- normalized 0–100
    canopy_pct      FLOAT NOT NULL,     -- 0–100 percentage
    geometry        GEOMETRY(LINESTRING, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_edges_source ON street_edges (source_node);
CREATE INDEX IF NOT EXISTS idx_edges_target ON street_edges (target_node);
CREATE INDEX IF NOT EXISTS idx_edges_geometry ON street_edges USING GIST (geometry);
