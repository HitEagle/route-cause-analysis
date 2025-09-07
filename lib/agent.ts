import { Agent, tool } from "@openai/agents";
import z from "zod";

const geocode = async (text: string) => {
  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) throw new Error("Missing GEOAPIFY_API_KEY");
  const params = new URLSearchParams({
    text,
    apiKey,
    limit: "5",
    lang: "en",
  });
  const res = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params.toString()}`,
  );
  if (!res.ok) throw new Error("Geocoding failed");
  type GeoapifyAutocompleteResponse = {
    features?: Array<{
      properties?: {
        formatted?: string;
        lat?: number;
        lon?: number;
      };
    }>;
  };
  const data = (await res.json()) as GeoapifyAutocompleteResponse;
  const first = data?.features?.[0];
  if (!first) throw new Error(`No match for ${text}`);
  return {
    name: first.properties?.formatted as string,
    lat: first.properties?.lat as number,
    lon: first.properties?.lon as number,
  };
};

const resolveRoute = tool({
  name: "resolve_route",
  description:
    "Resolve origin and destination queries to lat/lon in the US. Do not fetch route geometry.",
  parameters: z.object({
    originQuery: z.string().describe("Freeform origin text provided by user"),
    destinationQuery: z
      .string()
      .describe("Freeform destination text provided by user"),
  }),
  execute: async ({ originQuery, destinationQuery }) => {
    const origin = await geocode(originQuery);
    const destination = await geocode(destinationQuery);
    return JSON.stringify({ origin, destination });
  },
  needsApproval: false,
});

export const routeAgent = new Agent({
  name: "Route Planner",
  instructions:
    "You help plan driving routes between two places worldwide. " +
    "Ask clarifying questions until you have both origin and destination; if a country or city is ambiguous, ask for it. " +
    "Once both are known, call resolve_route exactly once with concise queries. " +
    "Do not include route geometry; the client will fetch it. " +
    "After the tool returns, summarize briefly using place names only.",
  tools: [resolveRoute],
});
