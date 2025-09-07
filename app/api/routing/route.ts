import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { waypoints, constraints, mode = "drive" } = body || {};

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEOAPIFY_API_KEY" },
        { status: 500 },
      );
    }

    if (!Array.isArray(waypoints) || waypoints.length < 2) {
      return NextResponse.json(
        { error: "Missing waypoints (need at least start and end)" },
        { status: 400 },
      );
    }

    const coords = waypoints as { lat: number; lon: number }[];
    const wpParam = coords.map((c) => `${c.lat},${c.lon}`).join("|");

    const avoid: string[] = [];
    if (constraints?.avoidHighways) avoid.push("highways");
    if (constraints?.avoidTolls) avoid.push("toll");
    if (constraints?.avoidFerries) avoid.push("ferry");

    const params = new URLSearchParams({ waypoints: wpParam, mode, apiKey });
    if (avoid.length > 0) params.set("avoid", avoid.join("|"));

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
