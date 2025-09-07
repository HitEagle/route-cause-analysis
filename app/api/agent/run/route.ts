import { routeAgent } from "@/lib/agent";
import { Runner, type AgentInputItem } from "@openai/agents";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { messages } = (await req.json()) as {
      messages?: { role: "user" | "assistant"; content: string }[];
    };

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
