import { geocode } from "@/lib/geocode";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      originQuery?: string;
      destinationQuery?: string;
    } | null;

    const originQuery = body?.originQuery?.trim();
    const destinationQuery = body?.destinationQuery?.trim();

    if (!originQuery || !destinationQuery) {
      return NextResponse.json(
        { error: "Missing origin or destination query" },
        { status: 400 },
      );
    }

    const [origin, destination] = await Promise.all([
      geocode(originQuery),
      geocode(destinationQuery),
    ]);

    return NextResponse.json({
      origin: { name: origin.name, lat: origin.lat, lon: origin.lon },
      destination: {
        name: destination.name,
        lat: destination.lat,
        lon: destination.lon,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Geocoding failed" },
      { status: 502 },
    );
  }
}
