import { validateJson } from "@/lib/validate";
import { route as fetchRoute } from "@/lib/routing";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      waypoints: z
        .array(z.object({ lat: z.number(), lon: z.number() }))
        .min(2, "Need at least start and end waypoints"),
      mode: z.string().optional().default("drive"),
    });

    const validated = await validateJson(req, schema);
    if (!validated.success) return validated.response;
    const { waypoints, mode } = validated.data;

    try {
      const data = await fetchRoute(waypoints, { mode });
      return NextResponse.json(data);
    } catch (e) {
      const details = e instanceof Error ? e.message : undefined;
      return NextResponse.json({ error: "Routing failed", details }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
