import { validateJson } from "@/lib/validate";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      waypoints: z
        .array(z.object({ lat: z.number(), lon: z.number() }))
        .min(2, "Need at least start and end waypoints"),
      constraints: z
        .object({
          avoidHighways: z.boolean().optional().default(false),
          avoidTolls: z.boolean().optional().default(false),
          avoidFerries: z.boolean().optional().default(false),
        })
        .partial()
        .optional()
        .default({}),
      mode: z.string().optional().default("drive"),
    });

    const validated = await validateJson(req, schema);
    if (!validated.success) return validated.response;
    const { waypoints, constraints, mode } = validated.data;

    const apiKey = process.env.GEOAPIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEOAPIFY_API_KEY" },
        { status: 500 },
      );
    }

    const wpParam = waypoints.map((c) => `${c.lat},${c.lon}`).join("|");

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
