"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Lower-Manhattan-ish framing — looks dramatic at this pitch.
const START = {
  center: [-73.992, 40.731] as [number, number],
  zoom: 13.4,
  pitch: 58,
  bearing: -18,
};

export default function HeroMap() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: ref.current,
      style: "mapbox://styles/mapbox/dark-v11",
      ...START,
      interactive: false,
      attributionControl: false,
      antialias: true,
      fadeDuration: 0,
    });

    let raf = 0;
    let cancelled = false;

    map.on("load", () => {
      // 3D buildings — gives the city real depth in the hero.
      const layers = map.getStyle()?.layers ?? [];
      const labelLayer = layers.find(
        (l) => l.type === "symbol" && (l.layout as { "text-field"?: unknown } | undefined)?.["text-field"],
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
                0, "#0f1626",
                40, "#172033",
                120, "#1f2a44",
                300, "#2a3a5c",
              ],
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["get", "min_height"],
              "fill-extrusion-opacity": 0.85,
            },
          },
          labelLayer?.id,
        );
      }

      // Heat-island glow patches — animated radial gradient via CircleLayer pulses.
      const heatPoints: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          [-73.9881, 40.7421], // Midtown
          [-73.9967, 40.7307], // East Village edge
          [-73.9794, 40.7484], // Bryant Park
          [-74.0071, 40.7265], // Tribeca / Hudson edge
          [-73.9911, 40.7516], // Times Sq
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
          "circle-color": "#f97316",
          "circle-blur": 1,
          "circle-opacity": 0.22,
        },
      });

      // Climate-smart route ribbon — a curated polyline through Manhattan
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
          "line-color": "#34d399",
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
          "line-color": "#34d399",
          "line-width": 3,
        },
      });

      // Slow cinematic camera orbit
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
  }, []);

  return (
    <div
      ref={ref}
      className="hero-map absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
