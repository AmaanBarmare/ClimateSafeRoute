"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import RoutePanel from "@/components/RoutePanel";
import type { RouteResponse } from "@/lib/types";

// Mapbox GL JS reads `window` — must run on the client only.
const RouteMap = dynamic(() => import("@/components/RouteMap"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm">
      Loading map…
    </div>
  ),
});

interface MapViewProps {
  data: RouteResponse;
}

export default function MapView({ data }: MapViewProps) {
  const [showShortest, setShowShortest] = useState(true);
  const [showClimate, setShowClimate] = useState(true);

  return (
    <div className="flex flex-col md:flex-row min-h-screen md:h-screen">
      <RouteMap
        routeShortest={data.route_shortest}
        routeClimate={data.route_climate}
        showShortest={showShortest}
        showClimate={showClimate}
        originCoords={data.origin_coords}
        destinationCoords={data.destination_coords}
      />
      <RoutePanel
        routeShortest={data.route_shortest}
        routeClimate={data.route_climate}
        explanation={data.explanation}
        showShortest={showShortest}
        showClimate={showClimate}
        onToggleShortest={() => setShowShortest((v) => !v)}
        onToggleClimate={() => setShowClimate((v) => !v)}
      />
    </div>
  );
}
