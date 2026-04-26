"use client";

import Link from "next/link";
import type { RouteStats } from "@/lib/types";
import ToggleSwitch from "./ToggleSwitch";

interface RoutePanelProps {
  routeShortest: RouteStats;
  routeClimate: RouteStats;
  explanation: string;
  showShortest: boolean;
  showClimate: boolean;
  onToggleShortest: () => void;
  onToggleClimate: () => void;
}

function heatColor(v: number) {
  if (v <= 40) return "text-green-400";
  if (v <= 70) return "text-orange-400";
  return "text-red-400";
}
function canopyColor(v: number) {
  if (v >= 30) return "text-green-400";
  if (v >= 15) return "text-orange-400";
  return "text-red-400";
}

function StatsCard({
  title,
  route,
  accentDot,
}: {
  title: string;
  route: RouteStats;
  accentDot: string;
}) {
  const km = (route.distance_m / 1000).toFixed(1);
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${accentDot}`} />
        <h3 className="font-semibold text-slate-50">{title}</h3>
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Distance
          </div>
          <div className="font-mono text-slate-100">{km} km</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Walk
          </div>
          <div className="font-mono text-slate-100">
            {route.duration_min.toFixed(0)} min
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Heat
          </div>
          <div className={`font-mono ${heatColor(route.heat_score)}`}>
            {route.heat_score.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Flood
          </div>
          <div className={`font-mono ${heatColor(route.flood_score)}`}>
            {route.flood_score.toFixed(0)}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Canopy
          </div>
          <div className={`font-mono ${canopyColor(route.canopy_pct)}`}>
            {route.canopy_pct.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoutePanel({
  routeShortest,
  routeClimate,
  explanation,
  showShortest,
  showClimate,
  onToggleShortest,
  onToggleClimate,
}: RoutePanelProps) {
  const noneVisible = !showShortest && !showClimate;
  return (
    <aside className="w-full md:w-[380px] md:h-screen overflow-y-auto bg-slate-800 border-l border-slate-700 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your routes</h2>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          ← New search
        </Link>
      </header>

      <section className="flex flex-col gap-3">
        <ToggleSwitch
          checked={showShortest}
          onChange={onToggleShortest}
          label="Shortest route"
          color="slate"
        />
        <StatsCard
          title="Standard"
          route={routeShortest}
          accentDot="bg-slate-400"
        />
      </section>

      <section className="flex flex-col gap-3">
        <ToggleSwitch
          checked={showClimate}
          onChange={onToggleClimate}
          label="Climate-smart route"
          color="green"
        />
        <StatsCard
          title="Climate-smart"
          route={routeClimate}
          accentDot="bg-green-500"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-widest text-slate-500">
          Why the difference?
        </h3>
        <p className="text-sm italic text-slate-300 leading-relaxed">
          {explanation}
        </p>
      </section>

      {noneVisible ? (
        <p className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg p-3">
          Turn on at least one route above to see it on the map.
        </p>
      ) : null}

      <footer className="mt-auto pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 leading-relaxed">
          Climate data: NYC HVI (ZCTA), NYC Flood Vulnerability Index (tract),
          NYC Street Tree Census (ZCTA aggregate). Updated annually.
        </p>
      </footer>
    </aside>
  );
}
