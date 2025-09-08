import type { FeatureCollection } from "geojson";

export type LatLng = { lat: number; lon: number };

export async function route(
  waypoints: LatLng[],
  opts?: { mode?: string },
): Promise<FeatureCollection> {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("Missing GEOAPIFY_API_KEY");

  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error("Need at least two waypoints");
  }

  const mode = opts?.mode ?? "drive";
  const wpParam = waypoints.map((c) => `${c.lat},${c.lon}`).join("|");
  const params = new URLSearchParams({ waypoints: wpParam, mode, apiKey });
  const url = `https://api.geoapify.com/v1/routing?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Routing failed");
  return (await res.json()) as FeatureCollection;
}
