"""Compute shortest-by-distance and shortest-by-climate-score routes."""
import networkx as nx
import osmnx as ox
from shapely.geometry import LineString, mapping

from app.schemas.route import RouteStats
from app.services.graph import get_graph

WALKING_SPEED_M_PER_MIN = 83.0  # ~5 km/h


def compute_routes(
    origin: tuple[float, float],
    destination: tuple[float, float],
) -> tuple[RouteStats, RouteStats]:
    """origin/destination are (lng, lat). Returns (route_shortest, route_climate)."""
    G = get_graph()

    origin_node = ox.nearest_nodes(G, X=origin[0], Y=origin[1])
    dest_node = ox.nearest_nodes(G, X=destination[0], Y=destination[1])

    if origin_node == dest_node:
        raise ValueError("Origin and destination resolve to the same street node")

    path_shortest = nx.shortest_path(G, origin_node, dest_node, weight="length")
    path_climate = nx.shortest_path(G, origin_node, dest_node, weight="climate_score")

    return _path_to_stats(G, path_shortest), _path_to_stats(G, path_climate)


def _path_to_stats(G: nx.DiGraph, path: list) -> RouteStats:
    coordinates: list[tuple[float, float]] = []
    total_length = 0.0
    heat: list[float] = []
    flood: list[float] = []
    canopy: list[float] = []

    for u, v in zip(path[:-1], path[1:]):
        edge = G[u][v]
        line = edge.get("geometry")
        if line is not None:
            coords = list(line.coords)
            if not coordinates:
                coordinates.extend(coords)
            else:
                coordinates.extend(coords[1:])  # skip first to avoid duplicate
        total_length += edge.get("length", 0.0)
        heat.append(edge.get("heat_score", 0.0))
        flood.append(edge.get("flood_score", 0.0))
        canopy.append(edge.get("canopy_pct", 0.0))

    if not coordinates:
        coordinates = [(G.nodes[n]["x"], G.nodes[n]["y"]) for n in path]

    geojson = {
        "type": "Feature",
        "geometry": mapping(LineString(coordinates)),
        "properties": {},
    }

    n = max(len(heat), 1)
    return RouteStats(
        geojson=geojson,
        distance_m=round(total_length, 1),
        duration_min=round(total_length / WALKING_SPEED_M_PER_MIN, 1),
        heat_score=round(sum(heat) / n, 1),
        flood_score=round(sum(flood) / n, 1),
        canopy_pct=round(sum(canopy) / n, 1),
    )
