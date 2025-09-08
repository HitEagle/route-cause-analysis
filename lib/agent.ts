import { Agent, tool } from "@openai/agents";
import z from "zod";

const submitRoutePlan = tool({
  name: "submit_route_plan",
  description:
    "Submit an ordered list of waypoints for a route. " +
    "Each waypoint MUST be geocodable place text only (do NOT include the word 'via', road names, or turn-by-turn instructions inside the query). " +
    "Format waypoints to be globally unambiguous: avoid two‑letter region abbreviations by themselves. Prefer full admin names (e.g., 'Santa Cruz, California'; 'Vancouver, British Columbia'; 'Pune, Maharashtra'). Include the country only when crossing borders or when ambiguity remains. " +
    "Use VIA waypoints to bias the route to follow requested roads (e.g., Highway 1) or avoid roads (e.g., avoid I‑5) instead of putting road names into queries. Pick real towns/landmarks along the intended corridor. " +
    "Return only the 'waypoints' array. Do not perform geocoding or fetch route geometry.",
  parameters: z.object({
    waypoints: z
      .array(
        z.object({
          query: z
            .string()
            .describe(
              "Geocodable place text only — city, town, landmark, or address. Prefer full admin names over abbreviations (e.g., 'Santa Cruz, California'). Add county or country only when needed to disambiguate. Do NOT include road names or instructions.",
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
  }),
  execute: async ({ waypoints }) => {
    return JSON.stringify({ waypoints });
  },
  needsApproval: false,
});

export const routeAgent = new Agent({
  name: "Route Cause Analysis",
  instructions:
    "You help plan driving routes from free‑form requests. " +
    "Ask clarifying questions until you have at least a start and an end. " +
    "If the user mentions roads to take/avoid (e.g., 'Highway 1', 'avoid I‑5', 'scenic'), ADD 2–8 VIA waypoints (real towns/landmarks along those roads) so that the router follows the intent. " +
    "Do NOT put road names, the word 'via', or instructions inside waypoint queries — only geocodable places. Keep labels concise (<=25 chars) and human-friendly. " +
    "Make every waypoint globally unambiguous WITHOUT assuming any specific country: prefer full admin names over abbreviations. Examples: 'Santa Cruz, California'; 'Vancouver, British Columbia'; 'Newcastle, New South Wales'; 'Pune, Maharashtra'; 'Guadalajara, Jalisco'; 'Cambridge, Cambridgeshire'. Only include the country name when crossing borders or when ambiguity remains (e.g., 'Cambridge, Cambridgeshire, UK'). " +
    "When ready, call submit_route_plan exactly once with an ordered array of waypoints {query,label,role} (first=start, last=end). Encode preferences via VIA waypoints only. " +
    "Do not include coordinates or route geometry; the server and client will handle geocoding and routing. After the tool returns, briefly summarize the plan listing the stop names in order.",
  tools: [submitRoutePlan],
});
