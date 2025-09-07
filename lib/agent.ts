import { Agent, tool } from "@openai/agents";
import z from "zod";

const collectRouteInputs = tool({
  name: "collect_route_inputs",
  description:
    "Collect normalized origin and destination queries and concise labels (worldwide). " +
    "Do not perform geocoding or fetch route geometry. Country names are allowed when needed to disambiguate.",
  parameters: z.object({
    originQuery: z
      .string()
      .describe(
        "Normalized, geocodable origin text (e.g., 'San Jose, CA' or 'Potsdamer Platz, Berlin, Germany').",
      ),
    destinationQuery: z
      .string()
      .describe(
        "Normalized, geocodable destination text (e.g., 'San Francisco, CA' or 'Shinjuku, Tokyo, Japan').",
      ),
    originLabel: z
      .string()
      .max(25, "Origin label must be 25 characters or fewer")
      .describe(
        "Concise human-readable label for origin (<=25 chars), e.g., 'San Jose, CA' or 'Potsdamer Platz, Berlin'. Country allowed if needed.",
      ),
    destinationLabel: z
      .string()
      .max(25, "Destination label must be 25 characters or fewer")
      .describe(
        "Concise human-readable label for destination (<=25 chars). Country allowed if needed.",
      ),
  }),
  execute: async ({ originQuery, destinationQuery, originLabel, destinationLabel }) => {
    return JSON.stringify({
      originQuery,
      destinationQuery,
      originLabel,
      destinationLabel,
    });
  },
  needsApproval: false,
});

export const routeAgent = new Agent({
  name: "Route Planner",
  instructions:
    "You help plan driving routes between two places worldwide. " +
    "Ask clarifying questions until you have both origin and destination; if a city/region/country is ambiguous, ask for it. " +
    "Once both are known, call collect_route_inputs exactly once with concise, geocodable originQuery and destinationQuery, and provide originLabel and destinationLabel (<=25 chars). Country names are allowed when needed to disambiguate. " +
    "Do not include route geometry and do not include coordinates; the server and client will handle geocoding and routing. " +
    "After the tool returns, summarize briefly using place names only.",
  tools: [collectRouteInputs],
});
