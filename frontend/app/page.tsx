import Link from "next/link";
import dynamic from "next/dynamic";
import DualRouteAnimation from "@/components/DualRouteAnimation";
import ThemeToggle from "@/components/ThemeToggle";

const HeroMap = dynamic(() => import("@/components/HeroMap"), { ssr: false });

export default function LandingPage() {
  return (
    <main className="relative overflow-x-hidden">
      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-[100svh] flex flex-col">
        <div className="absolute inset-0 -z-20 fade-bottom">
          <HeroMap />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              background:
                "linear-gradient(180deg, rgba(6,10,22,0.55) 0%, rgba(6,10,22,0.35) 40%, rgba(6,10,22,0.85) 100%)",
            }}
          />
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              background:
                "linear-gradient(180deg, rgba(247,249,252,0.50) 0%, rgba(247,249,252,0.65) 50%, rgba(247,249,252,0.95) 100%)",
            }}
          />
        </div>
        <div aria-hidden className="grain absolute inset-0 -z-10 pointer-events-none" />

        {/* Top nav */}
        <nav className="relative z-10 flex items-center justify-between px-6 md:px-10 py-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="font-display text-lg tracking-tight text-slate-900 dark:text-slate-100">
              ClimateSafe<span className="text-emerald-600 dark:text-emerald-300"> · </span>Route
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600 dark:text-slate-300/80">
            <a href="#how" className="hover:text-slate-900 dark:hover:text-white transition-colors">How it works</a>
            <a href="#data" className="hover:text-slate-900 dark:hover:text-white transition-colors">Climate data</a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/app"
              className="group inline-flex items-center gap-2 rounded-full font-semibold text-sm px-5 py-2.5 transition-colors
                         bg-emerald-600 hover:bg-emerald-700 text-white
                         dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950"
            >
              Open the app
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="transition-transform group-hover:translate-x-0.5">
                <path d="M3 7h8m0 0L7 3m4 4l-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </nav>

        {/* Hero copy */}
        <div className="relative z-10 flex-1 flex items-center px-6 md:px-10">
          <div className="max-w-5xl w-full pb-24 pt-8">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] backdrop-blur animate-fade-up
                         border border-emerald-200 bg-white/70 text-emerald-700
                         dark:border-white/10 dark:bg-white/[0.04] dark:text-emerald-200/90"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              Live in NYC · Manhattan + Brooklyn
            </div>

            <h1
              className="font-display font-light mt-6 leading-[0.95] tracking-tight text-[clamp(2.5rem,7vw,6rem)] animate-fade-up
                         text-slate-900 dark:text-white"
              style={{ animationDelay: "120ms" }}
            >
              The shortest path
              <br />
              isn't the <span className="italic text-emerald-600 dark:text-emerald-300">coolest</span>.
            </h1>

            <p
              className="mt-7 max-w-xl text-base md:text-lg leading-relaxed animate-fade-up
                         text-slate-700 dark:text-slate-200/85"
              style={{ animationDelay: "240ms" }}
            >
              ClimateSafe Route plans a walk that dodges urban heat islands,
              FEMA flood zones, and bare-asphalt blocks — using NYC's own
              public climate data and a street graph scored block-by-block.
            </p>

            <div
              className="mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-up"
              style={{ animationDelay: "360ms" }}
            >
              <Link
                href="/app"
                className="group inline-flex items-center justify-center gap-2 rounded-full font-semibold text-base px-7 py-4 transition-colors
                           bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_10px_40px_-10px_rgba(5,150,105,0.5)]
                           dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 dark:shadow-[0_10px_40px_-10px_rgba(52,211,153,0.6)]"
              >
                Plan a cooler walk
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
                  <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a
                href="#how"
                className="inline-flex items-center justify-center gap-2 rounded-full font-medium text-base px-6 py-4 backdrop-blur transition-colors
                           border border-slate-300 bg-white/60 hover:bg-white text-slate-800
                           dark:border-white/15 dark:hover:border-white/30 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:text-slate-100"
              >
                See how it works
              </a>
            </div>

            <div
              className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6 max-w-3xl animate-fade-up"
              style={{ animationDelay: "480ms" }}
            >
              <Stat label="Heat layers" value="3" suffix="datasets" />
              <Stat label="Street edges" value="48k+" suffix="scored" />
              <Stat label="Avg. heat reduction" value="42%" suffix="vs. shortest" />
              <Stat label="Median detour" value="+5 min" suffix="walk" />
            </div>
          </div>
        </div>

        <div className="relative z-10 pb-8 flex items-center justify-center text-[10px] uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400/70">
          <div className="flex items-center gap-3">
            <span>Scroll</span>
            <span className="h-[1px] w-10 bg-slate-400/60 dark:bg-slate-500/60" />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section id="how" className="relative px-6 md:px-10 py-24 md:py-36">
        <div className="absolute inset-0 -z-10 topo-lines opacity-70" />
        <div className="max-w-6xl mx-auto">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="font-display font-light text-4xl md:text-6xl leading-[1.02] tracking-tight max-w-3xl mt-4 text-slate-900 dark:text-white">
            Two routes, side by side.
            <br />
            <span className="italic text-emerald-600 dark:text-emerald-300">You choose the tradeoff.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base md:text-lg text-slate-600 dark:text-slate-400">
            Every street segment in NYC is scored on heat vulnerability, flood
            risk, and tree canopy. We compute the shortest path and the
            climate-smart path on the same graph — then explain the difference
            in plain English.
          </p>

          <div className="grid lg:grid-cols-5 gap-10 mt-14 items-center">
            <div className="lg:col-span-3">
              <DualRouteAnimation />
            </div>
            <ol className="lg:col-span-2 flex flex-col gap-6">
              <Step
                n="01"
                title="Pre-scored street graph"
                body="OSMnx pulls Manhattan + Brooklyn from OpenStreetMap. Every edge is spatially joined with NYC HVI, FEMA flood zones, and tree canopy data — once, into PostGIS."
              />
              <Step
                n="02"
                title="Two paths, one query"
                body="A Dijkstra search runs twice: weighted by length, then weighted by a composite climate score. Both routes return in the same response."
              />
              <Step
                n="03"
                title="Plain-English tradeoff"
                body="An LLM compares the two routes and writes a two-sentence summary: minutes added, shade gained, flood zones avoided."
              />
            </ol>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ DATA STRIP ═══════════════════════ */}
      <section
        id="data"
        className="relative px-6 md:px-10 py-20 border-y
                   border-slate-200 bg-gradient-to-b from-slate-50 to-white
                   dark:border-white/5 dark:from-[#070d1c] dark:to-[#060a16]"
      >
        <div className="max-w-6xl mx-auto">
          <SectionLabel>Climate data layers</SectionLabel>
          <div className="mt-8 grid md:grid-cols-3 gap-5">
            <DataCard
              tone="orange"
              tag="Heat Vulnerability"
              source="NYC DOHMH · NTA-level"
              title="Where the city gets dangerously hot."
              body="The Heat Vulnerability Index combines surface temperature, tree cover, AC access, and demographics into a 1–5 score per neighborhood."
            />
            <DataCard
              tone="blue"
              tag="Flood Zones"
              source="FEMA · NYC Open Data"
              title="Avoid the corners that flash-flood."
              body="AE / VE / X zones are vectorized and joined to every street edge. Climate-smart routes route around AE/VE on rainy days."
            />
            <DataCard
              tone="emerald"
              tag="Tree Canopy"
              source="NYC Parks · LiDAR derived"
              title="More shade, lower felt temperature."
              body="Per-block canopy percentage. A street with 35% canopy can feel 5–8°F cooler than the bare asphalt block next to it."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURE PAIR ═══════════════════════ */}
      <section className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <SectionLabel>Why we built it</SectionLabel>
            <h3 className="font-display font-light text-3xl md:text-5xl leading-[1.05] tracking-tight mt-4 text-slate-900 dark:text-white">
              Walking directions haven't kept up with a warming city.
            </h3>
            <p className="mt-6 text-base md:text-lg leading-relaxed text-slate-600 dark:text-slate-400">
              Google Maps optimizes for distance and time. Neither tells you
              which streets bake in afternoon sun, which block flooded last
              August, or where the canopy disappears. ClimateSafe Route bakes
              that information into the routing weights themselves.
            </p>
            <ul className="mt-8 space-y-3 text-slate-700 dark:text-slate-300">
              <Bullet>Pedestrian-only — no cars, no transit, no compromises.</Bullet>
              <Bullet>Open-data first — no proprietary signals, fully reproducible.</Bullet>
              <Bullet>Designed for stroller users, runners, elders, anyone heat-sensitive.</Bullet>
            </ul>
          </div>
          <CompareCard />
        </div>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section id="faq" className="relative px-6 md:px-10 py-24">
        <div className="max-w-3xl mx-auto">
          <SectionLabel>Questions</SectionLabel>
          <h3 className="font-display font-light text-3xl md:text-5xl leading-tight tracking-tight mt-4 text-slate-900 dark:text-white">
            Things people ask.
          </h3>
          <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 dark:divide-white/5 dark:border-white/5">
            <Faq q="Does it work outside NYC?">
              Not yet. The street graph and climate layers are NYC-only for now (Manhattan + Brooklyn). The architecture is portable to any city with public HVI / canopy / flood data.
            </Faq>
            <Faq q="Is it real-time?">
              No. Climate scores are pre-computed from public datasets. Routing is fast because the heavy spatial work happened at ingestion, not request time.
            </Faq>
            <Faq q="Can I save or share routes?">
              Not in this version. It's a comparison tool, not a navigation app — you choose, then walk.
            </Faq>
            <Faq q="What's the LLM doing?">
              Translating two numeric route summaries into one human sentence: how much longer, how much cooler, what it avoids.
            </Faq>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CTA ═══════════════════════ */}
      <section className="relative px-6 md:px-10 py-28 md:py-36">
        <div className="absolute inset-0 -z-10 topo-lines" />
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="font-display font-light text-4xl md:text-7xl leading-[0.98] tracking-tight text-slate-900 dark:text-white">
            Pick a cooler<br />
            <span className="italic text-emerald-600 dark:text-emerald-300">way home.</span>
          </h3>
          <p className="mt-6 max-w-lg mx-auto text-slate-600 dark:text-slate-400">
            Drop in any two NYC addresses. We'll show you both routes and let
            you decide what the extra minutes are worth.
          </p>
          <Link
            href="/app"
            className="group inline-flex mt-10 items-center gap-2 rounded-full font-semibold text-base px-8 py-4 transition-colors
                       bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_20px_60px_-20px_rgba(5,150,105,0.5)]
                       dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 dark:shadow-[0_20px_60px_-20px_rgba(52,211,153,0.6)]"
          >
            Launch ClimateSafe Route
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="transition-transform group-hover:translate-x-1">
              <path d="M3 8h10m0 0L9 4m4 4l-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="relative px-6 md:px-10 pt-12 pb-10 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 md:items-end md:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <div className="font-display text-base tracking-tight text-slate-900 dark:text-slate-100">
                ClimateSafe<span className="text-emerald-600 dark:text-emerald-300"> · </span>Route
              </div>
              <div className="text-xs text-slate-500">
                Built with NYC Open Data, OpenStreetMap, FEMA, Mapbox.
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-2">
            <span>© {new Date().getFullYear()} ClimateSafe Route</span>
            <a className="hover:text-slate-700 dark:hover:text-slate-300" href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>
            <a className="hover:text-slate-700 dark:hover:text-slate-300" href="https://www.mapbox.com/about/maps/">© Mapbox</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ─────────────────────────── Subcomponents ─────────────────────────── */

function Logo() {
  return (
    <div
      className="relative h-9 w-9 rounded-xl grid place-items-center
                 bg-gradient-to-br from-emerald-200/60 to-emerald-100/30 border border-emerald-300/60 shadow-[0_0_24px_-8px_rgba(5,150,105,0.4)]
                 dark:from-emerald-400/30 dark:to-emerald-500/10 dark:border-emerald-300/30 dark:shadow-[0_0_24px_-8px_rgba(52,211,153,0.6)]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-emerald-600 dark:text-emerald-400">
        <path
          d="M2 14 C 5 16, 8 6, 11 9 S 16 4, 16 4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="2.4" cy="14" r="1.4" fill="currentColor" />
        <circle cx="16" cy="4" r="1.4" fill="currentColor" />
      </svg>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix: string }) {
  return (
    <div>
      <div className="font-display text-3xl md:text-4xl tracking-tight text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{suffix}</div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300/80">
      <span className="h-px w-8 bg-emerald-500/70 dark:bg-emerald-400/60" />
      {children}
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li className="relative pl-14 pr-2 py-4 group">
      <span className="absolute left-0 top-4 font-mono text-xs tracking-widest text-emerald-700 dark:text-emerald-300/80">
        {n}
      </span>
      <span className="absolute left-9 top-5 h-px w-3 bg-emerald-400/60 dark:bg-emerald-300/40" />
      <h4 className="font-display text-xl text-slate-900 dark:text-white">{title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
    </li>
  );
}

function DataCard({
  tone,
  tag,
  source,
  title,
  body,
}: {
  tone: "orange" | "blue" | "emerald";
  tag: string;
  source: string;
  title: string;
  body: string;
}) {
  const toneMap = {
    orange: { glow: "rgba(249,115,22,0.18)", text: "text-orange-600 dark:text-orange-300", dot: "bg-orange-500" },
    blue: { glow: "rgba(59,130,246,0.18)", text: "text-sky-600 dark:text-sky-300", dot: "bg-sky-500" },
    emerald: { glow: "rgba(52,211,153,0.18)", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  }[tone];

  return (
    <div
      className="relative rounded-3xl p-7 overflow-hidden group transition-colors
                 border border-slate-200 bg-white hover:border-slate-300
                 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-56 w-56 rounded-full blur-3xl opacity-40 dark:opacity-100"
        style={{ background: toneMap.glow }}
      />
      <div className="relative flex items-center justify-between">
        <span className={`text-[10px] uppercase tracking-[0.22em] font-medium ${toneMap.text}`}>
          {tag}
        </span>
        <span className={`h-2.5 w-2.5 rounded-full ${toneMap.dot}`} />
      </div>
      <h4 className="relative font-display text-2xl md:text-[26px] mt-5 leading-snug text-slate-900 dark:text-white">
        {title}
      </h4>
      <p className="relative text-sm mt-3 leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
      <p className="relative mt-6 text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Source · {source}
      </p>
    </div>
  );
}

function CompareCard() {
  return (
    <div
      className="relative rounded-3xl p-1
                 border border-slate-200 bg-gradient-to-br from-white to-slate-50
                 dark:border-white/10 dark:from-white/[0.04] dark:to-white/[0.01]"
    >
      <div className="rounded-[22px] p-7 bg-white dark:bg-[#080e1d]">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          <span>Battery Park → Central Park</span>
          <span className="font-mono text-emerald-700 dark:text-emerald-300/90">/route</span>
        </div>

        <div className="mt-7 space-y-5">
          <CompareRow
            color="bg-slate-400"
            label="Shortest"
            distance="6.4 km"
            time="78 min"
            heat="78"
            canopy="11%"
          />
          <CompareRow
            color="bg-emerald-500 dark:bg-emerald-400"
            label="Climate-smart"
            distance="6.9 km"
            time="84 min"
            heat="41"
            canopy="34%"
            highlight
          />
        </div>

        <div className="mt-7 rounded-2xl p-4
                        border border-emerald-200 bg-emerald-50
                        dark:border-emerald-300/15 dark:bg-emerald-400/[0.04]">
          <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300/80">
            Plain-English summary
          </div>
          <p className="text-sm mt-2 leading-relaxed text-slate-700 dark:text-slate-200">
            "The climate-smart route adds 6 minutes but cuts heat exposure
            roughly in half and walks under three times as much shade. It
            also avoids two FEMA flood-risk zones near the seawall."
          </p>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  color,
  label,
  distance,
  time,
  heat,
  canopy,
  highlight,
}: {
  color: string;
  label: string;
  distance: string;
  time: string;
  heat: string;
  canopy: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-12 gap-3 items-center rounded-xl px-3 py-3 ${
        highlight
          ? "bg-emerald-50 ring-1 ring-emerald-200 dark:bg-emerald-400/[0.06] dark:ring-emerald-300/20"
          : ""
      }`}
    >
      <div className="col-span-4 flex items-center gap-3">
        <span className={`h-1.5 w-6 rounded-full ${color}`} />
        <span className="text-sm text-slate-800 dark:text-slate-200">{label}</span>
      </div>
      <Cell label="Dist" value={distance} />
      <Cell label="Time" value={time} />
      <Cell label="Heat" value={heat} />
      <Cell label="Canopy" value={canopy} />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="col-span-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className="font-mono text-sm mt-0.5 text-slate-900 dark:text-slate-100">{value}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer items-center justify-between gap-6 list-none">
        <span className="font-display text-lg md:text-xl text-slate-900 dark:text-white">{q}</span>
        <span className="h-7 w-7 rounded-full grid place-items-center transition-transform group-open:rotate-45
                         border border-slate-300 text-slate-600
                         dark:border-white/15 dark:text-slate-300">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </summary>
      <p className="mt-3 text-sm md:text-base leading-relaxed pr-12 text-slate-600 dark:text-slate-400">
        {children}
      </p>
    </details>
  );
}
