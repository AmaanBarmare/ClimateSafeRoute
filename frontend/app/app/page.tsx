import Link from "next/link";
import SearchBar from "@/components/SearchBar";

export const dynamic = "force-dynamic";

export default function AppPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 gap-8 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 20% 10%, rgba(34,197,94,0.10), transparent 50%), radial-gradient(circle at 80% 80%, rgba(59,130,246,0.12), transparent 55%)",
        }}
      />
      <Link
        href="/"
        className="absolute top-6 left-6 text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-100 transition-colors"
      >
        ← Back home
      </Link>

      <section className="flex flex-col items-center gap-4 max-w-xl text-center">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/80 font-medium">
          ClimateSafe Route
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-light leading-tight tracking-tight">
          Route smarter. <span className="italic text-emerald-300">Stay cooler.</span>
        </h1>
        <p className="text-slate-400 text-base md:text-lg">
          A pedestrian navigation tool that routes you around urban heat
          islands and flood zones — not just the shortest path.
        </p>
      </section>

      <SearchBar />

      <p className="text-sm text-slate-500">
        Try: <span className="text-slate-300">Battery Park</span> to{" "}
        <span className="text-slate-300">Central Park</span>
      </p>
    </main>
  );
}
