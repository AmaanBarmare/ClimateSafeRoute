import Link from "next/link";
import { fetchRoute } from "@/lib/api";
import MapView from "./MapView";

export const dynamic = "force-dynamic";

interface MapPageProps {
  searchParams: {
    origin?: string;
    destination?: string;
    originLng?: string;
    originLat?: string;
    destLng?: string;
    destLat?: string;
  };
}

const parseCoords = (
  lng?: string,
  lat?: string,
): [number, number] | undefined => {
  if (!lng || !lat) return undefined;
  const lngN = Number(lng);
  const latN = Number(lat);
  return Number.isFinite(lngN) && Number.isFinite(latN) ? [lngN, latN] : undefined;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const origin = searchParams.origin?.trim();
  const destination = searchParams.destination?.trim();
  const originCoords = parseCoords(searchParams.originLng, searchParams.originLat);
  const destinationCoords = parseCoords(searchParams.destLng, searchParams.destLat);

  if (!origin || !destination) {
    return (
      <ErrorScreen
        title="Missing addresses"
        message="Both origin and destination are required."
      />
    );
  }

  let data;
  try {
    data = await fetchRoute(origin, destination, originCoords, destinationCoords);
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Something went wrong.";
    return <ErrorScreen title="Couldn't compute route" message={detail} />;
  }

  return <MapView data={data} />;
}

function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
      <p className="max-w-md text-slate-600 dark:text-slate-400">{message}</p>
      <Link
        href="/app"
        className="mt-2 px-4 py-2 rounded-lg font-medium transition-colors
                   bg-emerald-600 hover:bg-emerald-700 text-white
                   dark:bg-emerald-400 dark:hover:bg-emerald-300 dark:text-slate-950"
      >
        Try again
      </Link>
    </main>
  );
}
