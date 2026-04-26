import Link from "next/link";
import { fetchRoute } from "@/lib/api";
import MapView from "./MapView";

export const dynamic = "force-dynamic";

interface MapPageProps {
  searchParams: { origin?: string; destination?: string };
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const origin = searchParams.origin?.trim();
  const destination = searchParams.destination?.trim();

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
    data = await fetchRoute(origin, destination);
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
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-slate-400 max-w-md">{message}</p>
      <Link
        href="/"
        className="mt-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
      >
        Try again
      </Link>
    </main>
  );
}
