import type { Feature, LineString } from "geojson";

export interface RouteStats {
  geojson: Feature<LineString>;
  distance_m: number;
  duration_min: number;
  heat_score: number;        // 0-100
  flood_score: number;       // 0-100
  canopy_pct: number;        // 0-100
}

export interface RouteResponse {
  route_shortest: RouteStats;
  route_climate: RouteStats;
  explanation: string;
  origin_coords: [number, number];      // [lng, lat]
  destination_coords: [number, number]; // [lng, lat]
}

export type RouteData = RouteStats;
