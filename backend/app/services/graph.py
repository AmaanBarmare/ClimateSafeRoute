"""In-memory NetworkX graph loaded once at FastAPI startup.

We extract node x/y from edge endpoint coordinates so OSMnx's `nearest_nodes`
KD-tree can locate the closest node to a (lng, lat) request.
"""
from typing import Optional

import networkx as nx
from shapely import wkb
from sqlalchemy import text

from app.db.connection import engine

_graph: Optional[nx.DiGraph] = None


def load_graph_on_startup() -> None:
    """Build a NetworkX DiGraph from the pre-scored street_edges table."""
    global _graph
    print("Loading street graph from PostGIS...")

    sql = text(
        """
        SELECT source_node, target_node, osm_id, name,
               length_m, climate_score, heat_score, flood_score, canopy_pct,
               ST_AsEWKB(geometry) AS geom_wkb
        FROM street_edges
        """
    )

    G = nx.DiGraph()
    G.graph["crs"] = "EPSG:4326"  # required by osmnx.nearest_nodes in OSMnx 2.x
    with engine.connect() as conn:
        for row in conn.execute(sql):
            line = wkb.loads(bytes(row.geom_wkb))
            coords = list(line.coords)

            # Node x/y from edge endpoints (used by ox.nearest_nodes)
            if row.source_node not in G:
                G.add_node(row.source_node, x=coords[0][0], y=coords[0][1])
            if row.target_node not in G:
                G.add_node(row.target_node, x=coords[-1][0], y=coords[-1][1])

            G.add_edge(
                row.source_node,
                row.target_node,
                length=row.length_m,
                climate_score=row.climate_score,
                heat_score=row.heat_score,
                flood_score=row.flood_score,
                canopy_pct=row.canopy_pct,
                name=row.name,
                geometry=line,
            )

    _graph = G
    print(f"Graph loaded: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")


def get_graph() -> nx.DiGraph:
    if _graph is None:
        raise RuntimeError("Graph not loaded — startup did not complete.")
    return _graph
