import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import ThemeToggle from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default function AppPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-8 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70 dark:opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.10), transparent 50%), radial-gradient(circle at 80% 80%, rgba(37,99,235,0.10), transparent 55%)",
        }}
      />
      <div aria-hidden className="absolute inset-0 -z-20 topo-lines opacity-60" />

      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.2em] transition-colors
                     text-slate-500 hover:text-slate-900
                     dark:text-slate-400 dark:hover:text-slate-100"
        >
          ← Back home
        </Link>
        <ThemeToggle />
      </div>

      <section className="flex flex-col items-center gap-4 max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] font-medium text-emerald-700 dark:text-emerald-400/80">
          ClimateSafe Route
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-light leading-tight tracking-tight text-slate-900 dark:text-white">
          Route smarter.{" "}
          <span className="italic text-emerald-600 dark:text-emerald-300">
            Stay cooler.
          </span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 dark:text-slate-400">
          A pedestrian navigation tool that routes you around urban heat
          islands and flood zones — not just the shortest path.
        </p>
      </section>

      <SearchBar />

      <p className="text-sm text-slate-500">
        Try:{" "}
        <span className="text-slate-700 dark:text-slate-300">Battery Park</span>{" "}
        to{" "}
        <span className="text-slate-700 dark:text-slate-300">Central Park</span>
      </p>
    </main>
  );
}
