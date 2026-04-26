import SearchBar from "@/components/SearchBar";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8">
      <section className="flex flex-col items-center gap-4 max-w-xl text-center">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">
          ClimateSafe Route
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight">
          Route smarter. Stay cooler.
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
