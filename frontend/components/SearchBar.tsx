"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Mapbox SearchBox touches `document` on module load — must be loaded client-only.
const SearchBox = dynamic(
  () => import("@mapbox/search-js-react").then((m) => m.SearchBox as never),
  { ssr: false },
);

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";
// Manhattan + Brooklyn bbox: [west, south, east, north]
const NYC_BBOX: [number, number, number, number] = [-74.04, 40.57, -73.83, 40.88];

const searchOptions = {
  bbox: NYC_BBOX,
  country: "us",
  types: "address,poi,place,neighborhood,locality",
  language: "en",
  limit: 6,
};

const searchTheme = {
  variables: {
    colorBackground: "#0f172a",
    colorBackgroundHover: "#1e293b",
    colorBackgroundActive: "#1e293b",
    colorText: "#f8fafc",
    colorPlaceholder: "#64748b",
    colorPrimary: "#3b82f6",
    border: "1px solid #334155",
    borderRadius: "0.5rem",
    boxShadow: "none",
    fontFamily: "inherit",
    unit: "16px",
    padding: "0.75rem 1rem",
  },
};

// SearchBox's exported types are inconsistent across versions; cast to any to avoid JSX/intrinsic noise.
const MapboxSearchBox = SearchBox as unknown as React.FC<{
  accessToken: string;
  value: string;
  onChange: (value: string) => void;
  onRetrieve: (res: { features: Array<{ properties: { name?: string; place_formatted?: string } }> }) => void;
  options: typeof searchOptions;
  theme: typeof searchTheme;
  placeholder?: string;
}>;

export default function SearchBar() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // SearchBox internals call `document` on import; render after mount only.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both an origin and a destination.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const params = new URLSearchParams({
      origin: origin.trim(),
      destination: destination.trim(),
    });
    router.push(`/map?${params.toString()}`);
  };

  const formatRetrieved = (res: { features: Array<{ properties: { name?: string; place_formatted?: string } }> }) => {
    const f = res.features[0];
    if (!f) return "";
    const parts = [f.properties.name, f.properties.place_formatted].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3 w-full max-w-md border border-slate-700"
    >
      <label>
        <span className="sr-only">From</span>
        {mounted ? (
          <MapboxSearchBox
            accessToken={MAPBOX_TOKEN}
            value={origin}
            onChange={(d) => setOrigin(d)}
            onRetrieve={(res) => setOrigin(formatRetrieved(res))}
            options={searchOptions}
            theme={searchTheme}
            placeholder="Enter starting point"
          />
        ) : (
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Enter starting point"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </label>
      <label>
        <span className="sr-only">To</span>
        {mounted ? (
          <MapboxSearchBox
            accessToken={MAPBOX_TOKEN}
            value={destination}
            onChange={(d) => setDestination(d)}
            onRetrieve={(res) => setDestination(formatRetrieved(res))}
            options={searchOptions}
            theme={searchTheme}
            placeholder="Enter destination"
          />
        ) : (
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Enter destination"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-800 disabled:cursor-wait text-white font-semibold rounded-lg py-3 transition-colors"
      >
        {submitting ? "Computing routes…" : "Find safe route"}
      </button>
    </form>
  );
}
