import { Agent, tool } from "@openai/agents";
import z from "zod";

const submitRoutePlan = tool({
  name: "submit_route_plan",
  description:
    "Submit an ordered list of waypoints and optional constraints for a route. " +
    "Each waypoint MUST be geocodable place text only (no 'via', no road names, no instructions). " +
    "Format waypoints to be globally unambiguous: avoid two‑letter region abbreviations by themselves. Prefer full admin names (e.g., 'Santa Cruz, California'; 'Vancouver, British Columbia'; 'Pune, Maharashtra'). Include the country only when crossing borders or when ambiguity remains. " +
    "Use VIA waypoints to bias the route to follow requested roads (e.g., Highway 1) instead of putting road names into queries. " +
    "Do not perform geocoding or fetch route geometry.",
  parameters: z.object({
    waypoints: z
      .array(
        z.object({
          query: z
            .string()
            .describe(
              "Geocodable place text only — city, town, landmark, or address. Prefer full admin names over abbreviations (e.g., 'Santa Cruz, California'). Add county or country only when needed to disambiguate. Do NOT include road names or constraints.",
            ),
          label: z
            .string()
            .max(25, "Label must be 25 characters or fewer")
            .describe("Concise human label for the map pin (<=25 chars)."),
          role: z.enum(["start", "via", "end"]).describe("Start, intermediate via, or end waypoint."),
        }),
      )
      .min(2)
      .max(12)
      .describe(
        "Ordered waypoints from start to end. Include 2–8 VIA stops when needed to enforce user preferences like 'take Highway 1'.",
      ),
    constraints: z.object({
      includeRoads: z.array(z.string()).describe("Road names/numbers the user requested to follow."),
      avoidRoads: z.array(z.string()).describe("Specific roads to avoid (names or numbers)."),
      avoidHighways: z.boolean().describe("Bias away from highways when true."),
      avoidTolls: z.boolean().describe("Bias away from tolls when true."),
      avoidFerries: z.boolean().describe("Bias away from ferries when true."),
      preferScenic: z.boolean().describe("Prefer scenic roads when true (use VIA waypoints to enforce)."),
      notes: z.string().max(200).nullable().describe("Optional brief rationale or notes for the chosen VIA points."),
    }),
  }),
  execute: async ({ waypoints, constraints }) => {
    return JSON.stringify({ waypoints, constraints });
  },
  needsApproval: false,
});

export const routeAgent = new Agent({
  name: "Route Planner",
  instructions:
    "You help plan driving routes from free‑form requests. " +
    "Ask clarifying questions until you have at least a start and an end. " +
    "If the user mentions roads to take/avoid (e.g., 'Highway 1', 'avoid I‑5', 'scenic'), ADD appropriate VIA waypoints (real towns/landmarks along those roads) so that the router follows the intent. " +
    "Do NOT put road names or instructions inside waypoint queries — only geocodable places. " +
    "Make every waypoint globally unambiguous WITHOUT assuming any specific country: prefer full admin names over abbreviations. Examples: 'Santa Cruz, California'; 'Vancouver, British Columbia'; 'Newcastle, New South Wales'; 'Pune, Maharashtra'; 'Guadalajara, Jalisco'; 'Cambridge, Cambridgeshire'. Only include the country name when crossing borders or when ambiguity remains (e.g., 'Cambridge, Cambridgeshire, UK'). " +
    "When ready, call submit_route_plan exactly once with: an ordered array of waypoints {query,label,role} (first=start, last=end), and a constraints object with ALL fields present. If a field is not relevant, set arrays to [], booleans to false, and notes to null. " +
    "Do not include coordinates or route geometry; the server and client will handle geocoding and routing. After the tool returns, briefly summarize the plan listing the stop names in order.",
  tools: [submitRoutePlan],
});
