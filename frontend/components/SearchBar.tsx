"use client";

import { MapPin, Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3 w-full max-w-md border border-slate-700"
    >
      <label className="relative">
        <span className="sr-only">From</span>
        <MapPin
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          aria-hidden
        />
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="Enter starting point"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
      <label className="relative">
        <span className="sr-only">To</span>
        <Navigation
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
          aria-hidden
        />
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination"
          className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
