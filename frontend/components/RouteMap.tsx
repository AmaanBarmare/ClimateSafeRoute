"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import type { LngLatBoundsLike } from "mapbox-gl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Layer,
  Marker,
  Source,
  type MapRef,
  type MapMouseEvent,
} from "react-map-gl";
import type { RouteStats } from "@/lib/types";
import SegmentTooltip from "./SegmentTooltip";
import { useTheme } from "@/lib/theme";

interface RouteMapProps {
  routeShortest: RouteStats;
  routeClimate: RouteStats;
  showShortest: boolean;
  showClimate: boolean;
  originCoords: [number, number];
  destinationCoords: [number, number];
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
const SHORTEST_LAYER_ID = "route-shortest-line";
const CLIMATE_LAYER_ID = "route-climate-line";

function computeBounds(
  ...featureCollections: Array<RouteStats["geojson"]>
): LngLatBoundsLike | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const f of featureCollections) {
    for (const [lng, lat] of f.geometry.coordinates) {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    }
  }
  if (!isFinite(minLng)) return null;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function RouteMap({
  routeShortest,
  routeClimate,
  showShortest,
  showClimate,
  originCoords,
  destinationCoords,
}: RouteMapProps) {
  const { theme } = useTheme();
  const mapRef = useRef<MapRef | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    heat: number;
    flood: number;
    canopy: number;
  } | null>(null);

  const bounds = useMemo(
    () => computeBounds(routeShortest.geojson, routeClimate.geojson),
    [routeShortest, routeClimate],
  );

  useEffect(() => {
    if (!bounds || !mapRef.current) return;
    mapRef.current.fitBounds(bounds, {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      duration: 800,
    });
  }, [bounds]);

  const handleMouseMove = useCallback(
    (event: MapMouseEvent) => {
      const features = event.features ?? [];
      if (features.length === 0) {
        setTooltip(null);
        return;
      }
      const layer = features[0].layer?.id;
      const route =
        layer === SHORTEST_LAYER_ID ? routeShortest : routeClimate;
      setTooltip({
        x: event.point.x,
        y: event.point.y,
        heat: route.heat_score,
        flood: route.flood_score,
        canopy: route.canopy_pct,
      });
    },
    [routeShortest, routeClimate],
  );

  const interactiveLayerIds: string[] = [];
  if (showShortest) interactiveLayerIds.push(SHORTEST_LAYER_ID);
  if (showClimate) interactiveLayerIds.push(CLIMATE_LAYER_ID);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        Missing NEXT_PUBLIC_MAPBOX_TOKEN.
      </div>
    );
  }

  const mapStyle =
    theme === "dark"
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
  const climateColor = theme === "dark" ? "#34d399" : "#059669";
  const shortestColor = theme === "dark" ? "#94a3b8" : "#64748b";

  return (
    <div className="relative flex-1 h-full">
      <Map
        // remount when theme changes — cheap and avoids hand-syncing styles
        key={theme}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={mapStyle}
        initialViewState={{
          longitude: -73.985,
          latitude: 40.758,
          zoom: 12,
        }}
        interactiveLayerIds={interactiveLayerIds}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ width: "100%", height: "100%" }}
      >
        {showShortest ? (
          <Source id="route-shortest" type="geojson" data={routeShortest.geojson}>
            <Layer
              id={SHORTEST_LAYER_ID}
              type="line"
              paint={{
                "line-color": shortestColor,
                "line-width": 4,
                "line-opacity": 0.85,
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        ) : null}

        {showClimate ? (
          <Source id="route-climate" type="geojson" data={routeClimate.geojson}>
            <Layer
              id={CLIMATE_LAYER_ID}
              type="line"
              paint={{
                "line-color": climateColor,
                "line-width": 4,
                "line-opacity": 0.95,
                "line-dasharray": [2, 1],
              }}
              layout={{ "line-cap": "round", "line-join": "round" }}
            />
          </Source>
        ) : null}

        <Marker longitude={originCoords[0]} latitude={originCoords[1]}>
          <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-emerald-500 dark:bg-emerald-400" />
        </Marker>
        <Marker
          longitude={destinationCoords[0]}
          latitude={destinationCoords[1]}
        >
          <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow bg-rose-500" />
        </Marker>
      </Map>

      {tooltip ? (
        <SegmentTooltip
          x={tooltip.x}
          y={tooltip.y}
          heatScore={tooltip.heat}
          floodScore={tooltip.flood}
          canopyPct={tooltip.canopy}
          visible
        />
      ) : null}
    </div>
  );
}
