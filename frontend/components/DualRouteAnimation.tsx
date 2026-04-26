"use client";

/**
 * Decorative SVG showing two pedestrian routes between A and B:
 *  - the gray "shortest" path cuts straight through hot streets
 *  - the green "climate-smart" path detours around heat blooms and through canopy
 */
export default function DualRouteAnimation() {
  return (
    <div
      className="relative w-full aspect-[5/3] rounded-3xl overflow-hidden
                 border border-slate-200 bg-slate-50
                 dark:border-white/10 dark:bg-[#070d1c]"
    >
      <div className="absolute inset-0 topo-lines" />

      {/* Heat-island blooms */}
      <div className="absolute left-[28%] top-[34%] h-40 w-40 rounded-full bg-orange-400/40 blur-3xl animate-pulse-glow dark:bg-orange-500/30" />
      <div
        className="absolute left-[50%] top-[58%] h-52 w-52 rounded-full bg-rose-400/30 blur-3xl animate-pulse-glow dark:bg-rose-500/20"
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className="absolute right-[10%] top-[20%] h-32 w-32 rounded-full bg-amber-400/30 blur-3xl animate-pulse-glow dark:bg-amber-400/20"
        style={{ animationDelay: "0.6s" }}
      />

      {/* Tree canopy patches */}
      <div className="absolute left-[12%] top-[60%] h-24 w-32 rounded-full bg-emerald-500/35 blur-2xl dark:bg-emerald-500/25" />
      <div className="absolute right-[18%] bottom-[12%] h-28 w-40 rounded-full bg-emerald-400/30 blur-2xl dark:bg-emerald-400/20" />

      <svg
        viewBox="0 0 500 300"
        className="relative h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="grid-light" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0f172a" stopOpacity="0.06" />
            <stop offset="1" stopColor="#0f172a" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="grid-dark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.04" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <pattern id="streets-light" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="url(#grid-light)" strokeWidth="0.6" />
          </pattern>
          <pattern id="streets-dark" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="url(#grid-dark)" strokeWidth="0.5" />
          </pattern>
          <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* faux street grid — the dark/light versions are layered, opacity flips by theme */}
        <rect className="block dark:hidden" width="500" height="300" fill="url(#streets-light)" />
        <rect className="hidden dark:block" width="500" height="300" fill="url(#streets-dark)" />

        {/* Shortest route — slate gray works in both modes */}
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

        {/* Climate-smart route — emerald (slightly different shade per mode) */}
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          className="text-emerald-500 dark:text-emerald-400"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          opacity="0.18"
          filter="url(#soft-glow)"
        />
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          className="text-emerald-600 dark:text-emerald-400"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="1400"
          style={{ strokeDashoffset: 1400, animation: "draw 3s ease-in-out forwards" }}
        />
        <path
          d="M 60 240 C 110 270, 160 270, 200 235 C 235 205, 250 190, 285 195 C 330 200, 360 175, 380 140 C 400 105, 415 90, 430 70"
          className="text-emerald-300 dark:text-emerald-200"
          stroke="currentColor"
          strokeWidth="1.6"
          fill="none"
          opacity="0.9"
          style={{ strokeDasharray: "8 10", animation: "dashFlow 1.6s linear infinite" }}
        />

        {/* Origin pin (A) */}
        <g transform="translate(60 240)">
          <circle r="10" className="fill-white dark:fill-[#0b1220]" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }} />
          <circle r="3.5" style={{ fill: "var(--accent)" }} />
        </g>
        <text x="76" y="244" fontSize="10" fontFamily="var(--font-jetbrains)" className="fill-slate-500 dark:fill-slate-400" letterSpacing="0.18em">
          A · ORIGIN
        </text>

        {/* Destination pin (B) */}
        <g transform="translate(430 70)">
          <circle r="11" className="fill-white dark:fill-[#0b1220]" stroke="currentColor" strokeWidth="2" style={{ color: "var(--accent)" }} />
          <circle r="4" style={{ fill: "var(--accent)" }} />
          <circle r="14" fill="none" stroke="currentColor" strokeOpacity="0.4" style={{ color: "var(--accent)" }}>
            <animate attributeName="r" from="11" to="22" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite" />
          </circle>
        </g>
        <text x="380" y="56" fontSize="10" fontFamily="var(--font-jetbrains)" className="fill-slate-500 dark:fill-slate-400" letterSpacing="0.18em">
          B · DESTINATION
        </text>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-6 bg-slate-400 rounded-full" /> Shortest
        </span>
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-6 bg-emerald-500 dark:bg-emerald-400 rounded-full" /> Climate-smart
        </span>
        <span className="flex items-center gap-2 ml-auto">
          <span className="h-2 w-2 rounded-full bg-orange-500/80" /> Heat island
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500/80" /> Tree canopy
        </span>
      </div>
    </div>
  );
}
