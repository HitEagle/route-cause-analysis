import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { origin, destination, mode = "drive" } = body || {};
    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Missing origin or destination" },
        { status: 400 },
      );
    }

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEOAPIFY_API_KEY" },
        { status: 500 },
      );
    }

    const waypoints = `${origin.lat},${origin.lon}|${destination.lat},${destination.lon}`;
    const params = new URLSearchParams({ waypoints, mode, apiKey });
    const url = `https://api.geoapify.com/v1/routing?${params.toString()}`;

    const res = await fetch(url);
    if (!res.ok) {
      const t = await res.text();
      return NextResponse.json(
        { error: "Routing failed", details: t },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
