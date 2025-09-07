"use client";

import clsx from "clsx";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LocationCoords = { lat: number; lon: number };

export type ChatOutcome = {
  type: "resolved";
  origin: { name: string; coords: LocationCoords };
  destination: { name: string; coords: LocationCoords };
  summary?: string;
  route: FeatureCollection;
};

export type ChatProps = {
  onResolved: (outcome: ChatOutcome) => void;
};

// Convert agent history items to our simple message list
type AgentHistoryItem =
  | { type: 'message'; role: 'user' | 'assistant' | 'system'; content: string | { type: string; text?: string }[] }
  | { type: 'function_call'; name: string }
  | { type: 'function_call_result'; name: string; output?: { type: 'text'; text: string } };

function lastAssistantText(history: AgentHistoryItem[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item.type === "message" && item.role === "assistant") {
      const text =
        typeof item.content === "string"
          ? item.content
          : (item.content || [])
              .map((c) => (c.type === "output_text" || c.type === "input_text" ? c.text ?? "" : ""))
              .join("\n");
      return text.trim() || null;
    }
  }
  return null;
}

function extractToolResult(
  history: AgentHistoryItem[],
): { origin?: { name: string; lat: number; lon: number }; destination?: { name: string; lat: number; lon: number } } | null {
  for (const item of history ?? []) {
    if (item.type === "function_call_result" && item.name === "resolve_route") {
      try {
        if (item.output?.type === "text" && item.output?.text) {
          const parsed = JSON.parse(item.output.text);
          return { origin: parsed.origin, destination: parsed.destination };
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export function Chat({ onResolved }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Tell me where you want to go. For example: ‘to San Francisco from Sacramento’." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function runAgent(allMessages: ChatMessage[]) {
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: allMessages }),
    });
    if (!res.ok) throw new Error("Agent run failed");
    return res.json();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const next: ChatMessage[] = [
      ...messages,
      { role: "user", content: input.trim() },
      // Create a single assistant bubble that will be updated in place
      { role: "assistant", content: "Thinking…" },
    ];
    setInput("");
    setMessages(next);
    setBusy(true);
    try {
      const data = await runAgent(next);
      const history = data.history ?? [];
      const placeholderIndex = next.length - 1; // index of the assistant placeholder

      // If the agent called a tool, briefly reflect that status in the same bubble
      const fnCall = history.find((h: AgentHistoryItem) => h.type === "function_call") as
        | { type: "function_call"; name: string }
        | undefined;
      if (fnCall) {
        setMessages((m) => m.map((msg, i) => (i === placeholderIndex ? { ...msg, content: `Calling ${fnCall.name}…` } : msg)));
      }

      const payload = extractToolResult(history);
      if (payload?.origin && payload.destination) {
        // Fetch the route on the client after we have coordinates
        const routeRes = await fetch("/api/routing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { lat: payload.origin.lat, lon: payload.origin.lon },
            destination: { lat: payload.destination.lat, lon: payload.destination.lon },
          }),
        });
        if (routeRes.ok) {
          const route = (await routeRes.json()) as FeatureCollection;
          onResolved({
            type: "resolved",
            origin: { name: payload.origin.name, coords: { lat: payload.origin.lat, lon: payload.origin.lon } },
            destination: {
              name: payload.destination.name,
              coords: { lat: payload.destination.lat, lon: payload.destination.lon },
            },
            summary: data.response ?? undefined,
            route,
          });
        }
      }

      // Finally, replace the placeholder content with the assistant's final text
      const finalText = lastAssistantText(history) ?? (data.response as string | undefined) ?? "Done.";
      setMessages((m) => m.map((msg, i) => (i === placeholderIndex ? { ...msg, content: finalText } : msg)));
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "I hit a snag talking to the agent. Please try again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 border-b-4 border-black"
      >
        {messages.map((m, i) => (
          <div key={i} className={clsx("max-w-[92%]", m.role === "user" ? "ml-auto" : "mr-auto")}> 
            <div
              className={clsx(
                "px-4 py-3 border-4",
                m.role === "user" ? "bg-white text-black border-black" : "bg-black text-white border-black",
              )}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 flex gap-2 border-t-4 border-black">
        <input
          className="flex-1 px-3 py-3 border-4 border-black outline-none focus:ring-0 bg-white text-black placeholder-gray-500"
          placeholder="e.g., to SF from Sacramento"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="px-5 py-3 bg-black text-white border-4 border-black hover:bg-white hover:text-black transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
