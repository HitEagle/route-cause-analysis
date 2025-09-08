import { routeAgent } from "@/lib/agent";
import { validateJson } from "@/lib/validate";
import { Runner, type AgentInputItem } from "@openai/agents";
import { NextRequest, NextResponse } from "next/server";
import z from "zod";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const schema = z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          }),
        )
        .optional()
        .default([]),
    });

    const validated = await validateJson(req, schema);
    if (!validated.success) return validated.response;
    const { messages } = validated.data;

    const input: AgentInputItem[] = (messages ?? [])
      .filter((m) => m.role === "user")
      .map((m) => ({
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: m.content,
          },
        ],
      }));

    const runner = new Runner();
    const result = await runner.run(routeAgent, input);

    return NextResponse.json({
      history: result.history,
      response: result.finalOutput,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
