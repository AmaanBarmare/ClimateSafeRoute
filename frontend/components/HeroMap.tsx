"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTheme } from "@/lib/theme";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const START = {
  center: [-73.992, 40.731] as [number, number],
  zoom: 13.4,
  pitch: 58,
  bearing: -18,
};

interface Palette {
  style: string;
  buildingLow: string;
  buildingMid: string;
  buildingHigh: string;
  buildingTop: string;
  routeColor: string;
  routeGlow: string;
  heatColor: string;
  heatOpacity: number;
}

const PALETTES: Record<"dark" | "light", Palette> = {
  dark: {
    style: "mapbox://styles/mapbox/dark-v11",
    buildingLow: "#0f1626",
    buildingMid: "#172033",
    buildingHigh: "#1f2a44",
    buildingTop: "#2a3a5c",
    routeColor: "#34d399",
    routeGlow: "#34d399",
    heatColor: "#f97316",
    heatOpacity: 0.22,
  },
  light: {
    style: "mapbox://styles/mapbox/light-v11",
    buildingLow: "#e6ecf5",
    buildingMid: "#d4dcea",
    buildingHigh: "#c0cadf",
    buildingTop: "#a8b5d0",
    routeColor: "#059669",
    routeGlow: "#10b981",
    heatColor: "#ea580c",
    heatOpacity: 0.18,
  },
};

export default function HeroMap() {
  const ref = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!ref.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const palette = PALETTES[theme];

    const map = new mapboxgl.Map({
      container: ref.current,
      style: palette.style,
      ...START,
      interactive: false,
      attributionControl: false,
      antialias: true,
      fadeDuration: 0,
    });

    let raf = 0;
    let cancelled = false;

    map.on("load", () => {
      const layers = map.getStyle()?.layers ?? [];
      const labelLayer = layers.find(
        (l) =>
          l.type === "symbol" &&
          (l.layout as { "text-field"?: unknown } | undefined)?.["text-field"],
      );
      if (!map.getLayer("3d-buildings")) {
        map.addLayer(
          {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            filter: ["==", "extrude", "true"],
            type: "fill-extrusion",
            minzoom: 12,
            paint: {
              "fill-extrusion-color": [
                "interpolate",
                ["linear"],
                ["get", "height"],
                0, palette.buildingLow,
                40, palette.buildingMid,
                120, palette.buildingHigh,
                300, palette.buildingTop,
              ],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": theme === "dark" ? 0.85 : 0.9,
            },
          },
          labelLayer?.id,
        );
      }

      const heatPoints: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          [-73.9881, 40.7421],
          [-73.9967, 40.7307],
          [-73.9794, 40.7484],
          [-74.0071, 40.7265],
          [-73.9911, 40.7516],
        ].map(([lng, lat], i) => ({
          type: "Feature",
          properties: { i },
          geometry: { type: "Point", coordinates: [lng, lat] },
        })),
      };
      map.addSource("heat-points", { type: "geojson", data: heatPoints });
      map.addLayer({
        id: "heat-glow",
        type: "circle",
        source: "heat-points",
        paint: {
          "circle-radius": 70,
          "circle-color": palette.heatColor,
          "circle-blur": 1,
          "circle-opacity": palette.heatOpacity,
        },
      });

      const route: GeoJSON.Feature<GeoJSON.LineString> = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-74.0136, 40.7033],
            [-74.0089, 40.7115],
            [-74.0034, 40.7188],
            [-73.9994, 40.7253],
            [-73.9953, 40.7318],
            [-73.9909, 40.7402],
            [-73.9878, 40.7467],
            [-73.9831, 40.7548],
            [-73.9786, 40.7621],
          ],
        },
      };
      map.addSource("hero-route", { type: "geojson", data: route });
      map.addLayer({
        id: "hero-route-glow",
        type: "line",
        source: "hero-route",
        paint: {
          "line-color": palette.routeGlow,
          "line-width": 10,
          "line-opacity": 0.25,
          "line-blur": 6,
        },
      });
      map.addLayer({
        id: "hero-route-line",
        type: "line",
        source: "hero-route",
        paint: {
          "line-color": palette.routeColor,
          "line-width": 3,
        },
      });

      const startTime = performance.now();
      const orbit = (now: number) => {
        if (cancelled) return;
        const t = (now - startTime) / 1000;
        map.easeTo({
          bearing: START.bearing + Math.sin(t / 18) * 14,
          pitch: START.pitch + Math.sin(t / 22) * 4,
          duration: 80,
          easing: (x) => x,
        });
        raf = requestAnimationFrame(orbit);
      };
      raf = requestAnimationFrame(orbit);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      map.remove();
    };
  }, [theme]);

  return (
    <div
      ref={ref}
      className="hero-map absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
