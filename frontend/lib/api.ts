import type { RouteResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function fetchRoute(
  origin: string,
  destination: string,
  originCoords?: [number, number],
  destinationCoords?: [number, number],
): Promise<RouteResponse> {
  const body: Record<string, unknown> = { origin, destination };
  if (originCoords) body.origin_coords = originCoords;
  if (destinationCoords) body.destination_coords = destinationCoords;

  const res = await fetch(`${API_URL}/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    let detail = "Failed to compute route";
    try {
      const body = (await res.json()) as { detail?: string };
      if (body?.detail) detail = body.detail;
    } catch {
      /* response not JSON */
    }
    throw new Error(detail);
  }
  return (await res.json()) as RouteResponse;
}
