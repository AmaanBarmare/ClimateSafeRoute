"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

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

// Force the typed-input color via cssText. The SearchBox renders its own DOM
// where the input would otherwise inherit ambient colors and become invisible
// against a dark field on production builds.
const SHARED_INPUT_CSS = `
  input, input[type="text"], input[type="search"] {
    color: var(--mbx-text) !important;
    caret-color: var(--mbx-text) !important;
  }
  input::placeholder { color: var(--mbx-placeholder) !important; }
`;

interface SearchTheme {
  variables: Record<string, string>;
  cssText?: string;
}

interface RetrievedFeature {
  properties: { name?: string; place_formatted?: string };
  geometry?: { coordinates?: [number, number] };
}

const MapboxSearchBox = SearchBox as unknown as React.FC<{
  accessToken: string;
  value: string;
  onChange: (value: string) => void;
  onRetrieve: (res: { features: RetrievedFeature[] }) => void;
  options: typeof searchOptions;
  theme: SearchTheme;
  placeholder?: string;
}>;

export default function SearchBar() {
  const router = useRouter();
  const { theme } = useTheme();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Coords captured from the autocomplete pick. We compare against the label
  // they were captured for; if the user edits the text afterwards, coords
  // are no longer valid for that text and we fall back to backend geocoding.
  const originPick = useRef<{ label: string; coords: [number, number] } | null>(null);
  const destinationPick = useRef<{ label: string; coords: [number, number] } | null>(null);

  const searchTheme: SearchTheme = useMemo(() => {
    const isDark = theme === "dark";
    return {
      variables: {
        colorBackground: isDark ? "#0b1326" : "#ffffff",
        colorBackgroundHover: isDark ? "#162038" : "#f1f5f9",
        colorBackgroundActive: isDark ? "#162038" : "#e2e8f0",
        colorText: isDark ? "#f8fafc" : "#0f172a",
        colorPlaceholder: isDark ? "#64748b" : "#94a3b8",
        colorPrimary: isDark ? "#34d399" : "#059669",
        border: isDark ? "1px solid rgba(255,255,255,0.10)" : "1px solid #e2e8f0",
        borderRadius: "0.75rem",
        boxShadow: isDark
          ? "0 1px 0 rgba(255,255,255,0.04) inset"
          : "0 1px 2px rgba(15,23,42,0.04)",
        fontFamily: "inherit",
        unit: "16px",
        padding: "0.875rem 1rem",
      },
      cssText: `
        :host { --mbx-text: ${isDark ? "#f8fafc" : "#0f172a"}; --mbx-placeholder: ${isDark ? "#64748b" : "#94a3b8"}; }
        ${SHARED_INPUT_CSS}
      `,
    };
  }, [theme]);

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

    // Only attach coords if they match the current text — otherwise the user
    // edited the field after picking and the coords no longer correspond.
    if (originPick.current && originPick.current.label === origin.trim()) {
      params.set("originLng", String(originPick.current.coords[0]));
      params.set("originLat", String(originPick.current.coords[1]));
    }
    if (destinationPick.current && destinationPick.current.label === destination.trim()) {
      params.set("destLng", String(destinationPick.current.coords[0]));
      params.set("destLat", String(destinationPick.current.coords[1]));
    }

    router.push(`/map?${params.toString()}`);
  };

  const handleRetrieve = (
    res: { features: RetrievedFeature[] },
    setText: (s: string) => void,
    pickRef: React.MutableRefObject<{ label: string; coords: [number, number] } | null>,
  ) => {
    const f = res.features[0];
    if (!f) return;
    const label = [f.properties.name, f.properties.place_formatted].filter(Boolean).join(", ");
    setText(label);
    if (f.geometry?.coordinates) {
      pickRef.current = { label, coords: f.geometry.coordinates };
    } else {
      pickRef.current = null;
    }
  };

  const fallbackInputClass =
    "w-full rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 " +
    "bg-white border border-slate-200 text-slate-900 placeholder-slate-400 " +
    "dark:bg-slate-900 dark:border-white/10 dark:text-slate-50 dark:placeholder-slate-500";

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-5 flex flex-col gap-3 w-full max-w-md
                 bg-white border border-slate-200 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.18)]
                 dark:bg-slate-900/70 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-[0_10px_60px_-20px_rgba(0,0,0,0.8)]"
    >
      <label>
        <span className="sr-only">From</span>
        {mounted ? (
          <MapboxSearchBox
            accessToken={MAPBOX_TOKEN}
            value={origin}
            onChange={(d) => setOrigin(d)}
            onRetrieve={(res) => handleRetrieve(res, setOrigin, originPick)}
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
            className={fallbackInputClass}
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
            onRetrieve={(res) => handleRetrieve(res, setDestination, destinationPick)}
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
            className={fallbackInputClass}
          />
        )}
      </label>
      {error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl py-3.5 font-semibold text-base transition-colors
                   bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-emerald-300 disabled:cursor-wait
                   dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950 dark:disabled:bg-emerald-900 dark:disabled:text-emerald-200/40"
      >
        {submitting ? "Computing routes…" : "Find safe route"}
      </button>
    </form>
  );
}
