import { geocode } from "@/lib/geocode";
import { validateJson } from "@/lib/validate";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      waypointQueries: z.array(z.string().trim().min(1)).min(2),
    });
    const validated = await validateJson(req, schema);
    if (!validated.success) return validated.response;
    const { waypointQueries } = validated.data;
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
