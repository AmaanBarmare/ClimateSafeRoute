"use client";

import Link from "next/link";
import type { RouteStats } from "@/lib/types";
import ToggleSwitch from "./ToggleSwitch";
import ThemeToggle from "./ThemeToggle";

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
  if (v <= 40) return "text-emerald-600 dark:text-emerald-400";
  if (v <= 70) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
}
function canopyColor(v: number) {
  if (v >= 30) return "text-emerald-600 dark:text-emerald-400";
  if (v >= 15) return "text-orange-600 dark:text-orange-400";
  return "text-rose-600 dark:text-rose-400";
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
    <div
      className="rounded-xl p-4 flex flex-col gap-3
                 bg-white border border-slate-200
                 dark:bg-slate-900 dark:border-slate-700"
    >
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${accentDot}`} />
        <h3 className="font-semibold text-slate-900 dark:text-slate-50">{title}</h3>
      </div>
      <div className="flex gap-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Distance
          </div>
          <div className="font-mono text-slate-900 dark:text-slate-100">{km} km</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Walk
          </div>
          <div className="font-mono text-slate-900 dark:text-slate-100">
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
    <aside
      className="w-full md:w-[380px] md:h-screen overflow-y-auto p-6 flex flex-col gap-6
                 bg-slate-50 border-l border-slate-200 text-slate-900
                 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-50"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your routes</h2>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/app"
            className="text-sm transition-colors text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← New search
          </Link>
        </div>
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
          accentDot="bg-emerald-500 dark:bg-emerald-400"
        />
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs uppercase tracking-widest text-slate-500">
          Why the difference?
        </h3>
        <p className="text-sm italic leading-relaxed text-slate-700 dark:text-slate-300">
          {explanation}
        </p>
      </section>

      {noneVisible ? (
        <p className="text-xs rounded-lg p-3 border border-dashed
                      border-slate-300 text-slate-500
                      dark:border-slate-700 dark:text-slate-500">
          Turn on at least one route above to see it on the map.
        </p>
      ) : null}

      <footer className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs leading-relaxed text-slate-500">
          Climate data: NYC HVI (ZCTA), NYC Flood Vulnerability Index (tract),
          NYC Street Tree Census (ZCTA aggregate). Updated annually.
        </p>
      </footer>
    </aside>
  );
}
