"use client";

/**
 * Decorative SVG showing two pedestrian routes between A and B:
 *  - the gray "shortest" path cuts straight through hot streets
 *  - the green "climate-smart" path detours around heat blooms and through canopy
 * Routes draw in on mount and the climate route has a flowing dash pattern.
 */
export default function DualRouteAnimation() {
  return (
    <div className="relative w-full aspect-[5/3] rounded-3xl overflow-hidden border border-white/10 bg-[#070d1c]">
      {/* topographic + heat overlay */}
      <div className="absolute inset-0 topo-lines" />

      {/* Heat-island blooms */}
      <div className="absolute left-[28%] top-[34%] h-40 w-40 rounded-full bg-orange-500/30 blur-3xl animate-pulse-glow" />
      <div className="absolute left-[50%] top-[58%] h-52 w-52 rounded-full bg-rose-500/20 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.2s" }} />
      <div className="absolute right-[10%] top-[20%] h-32 w-32 rounded-full bg-amber-400/20 blur-3xl animate-pulse-glow" style={{ animationDelay: "0.6s" }} />

      {/* Tree canopy patches */}
      <div className="absolute left-[12%] top-[60%] h-24 w-32 rounded-full bg-emerald-500/25 blur-2xl" />
      <div className="absolute right-[18%] bottom-[12%] h-28 w-40 rounded-full bg-emerald-400/20 blur-2xl" />

      <svg
        viewBox="0 0 500 300"
        className="relative h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="grid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <pattern id="streets" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="url(#grid)" strokeWidth="0.5" />
          </pattern>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* faux street grid */}
        <rect width="500" height="300" fill="url(#streets)" />

        {/* Shortest route (gray) — straight through the heat */}
        <path
          d="M 60 240 L 140 200 L 220 170 L 290 140 L 360 110 L 430 70"
          stroke="#94a3b8"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="1200"
          className="animate-draw-route-slow"
          style={{ strokeDashoffset: 1200 }}
        />
        <path
          d="M 60 240 L 140 200 L 220 170 L 290 140 L 360 110 L 430 70"
          stroke="#94a3b8"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          opacity="0.18"
          filter="url(#soft-glow)"
        />

        {/* Climate-smart route (green) — bows away from heat, through canopy */}
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          stroke="#22c55e"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.18"
          filter="url(#soft-glow)"
        />
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          stroke="#22c55e"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="1400"
          className="animate-draw-route"
          style={{ strokeDashoffset: 1400 }}
        />
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          stroke="#bbf7d0"
          strokeWidth="1.6"
          fill="none"
          className="dash-flow"
          opacity="0.9"
        />

        {/* Origin pin (A) */}
        <g transform="translate(60 240)">
          <circle r="10" fill="#0b1220" stroke="#22c55e" strokeWidth="2" />
          <circle r="3.5" fill="#22c55e" />
        </g>
        <text x="76" y="244" fontSize="10" fontFamily="var(--font-jetbrains)" fill="#94a3b8" letterSpacing="0.18em">
          A · ORIGIN
        </text>

        {/* Destination pin (B) */}
        <g transform="translate(430 70)">
          <circle r="11" fill="#0b1220" stroke="#22c55e" strokeWidth="2" />
          <circle r="4" fill="#22c55e" />
          <circle r="14" fill="none" stroke="#22c55e" strokeOpacity="0.4">
            <animate attributeName="r" from="11" to="22" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </g>
        <text x="380" y="56" fontSize="10" fontFamily="var(--font-jetbrains)" fill="#94a3b8" letterSpacing="0.18em">
          B · DESTINATION
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-slate-300">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-6 bg-slate-400 rounded-full" /> Shortest
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-6 bg-emerald-400 rounded-full" /> Climate-smart
        </span>
        <span className="flex items-center gap-2 ml-auto">
          <span className="h-2 w-2 rounded-full bg-orange-500/70" /> Heat island
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500/70" /> Tree canopy
        </span>
      </div>
    </div>
  );
}
