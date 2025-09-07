import { geocode } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    type WaypointsBody = { waypointQueries?: string[] };
    const body = (await req.json()) as WaypointsBody | null;

    if (!body || !Array.isArray(body.waypointQueries)) {
      return NextResponse.json(
        { error: "Expected waypointQueries: string[]" },
        { status: 400 },
      );
    }

    const waypointQueries = body.waypointQueries.map((q) => `${q}`.trim()).filter(Boolean);
    if (waypointQueries.length < 2) {
      return NextResponse.json(
        { error: "Need at least two waypoint queries" },
        { status: 400 },
      );
    }
    const results = await Promise.all(waypointQueries.map((q) => geocode(q)));
    return NextResponse.json({
      waypoints: results.map((r) => ({ name: r.name, lat: r.lat, lon: r.lon })),
    });
  } catch {
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 502 },
    );
  }
}
