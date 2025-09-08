"use client";

import { useRouteStore, type Waypoint } from "@/lib/routeStore";
import clsx from "clsx";
import type { FeatureCollection } from "geojson";
import { useEffect, useRef, useState } from "react";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// Convert agent history items to our simple message list
type AgentHistoryItem =
  | { type: 'message'; role: 'user' | 'assistant' | 'system'; content: string | { type: string; text?: string }[] }
  | { type: 'function_call'; name: string }
  | { type: 'function_call_result'; name: string; output?: { type: 'text'; text: string } };

// Waypoints that come back from the agent plan
type PlanWaypoint = { query: string; label?: string; role: "start" | "via" | "end" };

function isFunctionCall(item: AgentHistoryItem): item is { type: "function_call"; name: string } {
  return item.type === "function_call";
}

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null;
}

function isPlanWaypointArray(val: unknown): val is PlanWaypoint[] {
  if (!Array.isArray(val) || val.length < 2) return false;
  return val.every((w) => {
    if (!isRecord(w)) return false;
    const role = w["role"];
    const roleOk = role === "start" || role === "via" || role === "end";
    const query = w["query"];
    const label = w["label"];
    const queryOk = typeof query === "string" && !!query.trim();
    const labelOk = label === undefined || typeof label === "string";
    return roleOk && queryOk && labelOk;
  });
}

type GeoResolved = { waypoints: { name: string; lat: number; lon: number }[] };

function isGeoResolved(val: unknown): val is GeoResolved {
  if (!isRecord(val)) return false;
  const wps = val["waypoints"];
  if (!Array.isArray(wps)) return false;
  return wps.every(
    (w) =>
      isRecord(w) &&
      typeof w["name"] === "string" &&
      typeof w["lat"] === "number" &&
      typeof w["lon"] === "number",
  );
}

function isFeatureCollection(obj: unknown): obj is FeatureCollection {
  if (!isRecord(obj)) return false;
  return obj["type"] === "FeatureCollection" && Array.isArray(obj["features"]);
}

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

function extractPlan(
  history: AgentHistoryItem[],
): { waypoints: PlanWaypoint[] } | null {
  for (const item of history ?? []) {
    if (item.type === "function_call_result" && item.name === "submit_route_plan") {
      try {
        if (item.output?.type === "text" && item.output?.text) {
          const parsed: unknown = JSON.parse(item.output.text);
          if (isRecord(parsed) && isPlanWaypointArray(parsed["waypoints"])) {
            return { waypoints: parsed["waypoints"] };
          }
        }
      } catch {
        // ignore
      }
    }
  }
  return null;
}

const initialAssistantMessage =
  "Tell me where you want to go. For example: ‘to San Francisco from Sacramento’.";

function initialMessages(): ChatMessage[] {
  return [
    { role: "assistant", content: initialAssistantMessage },
  ];
}

type AgentRunResult = { history?: AgentHistoryItem[]; response?: string };

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const setWaypoints = useRouteStore((s) => s.setWaypoints);
  const setRoute = useRouteStore((s) => s.setRoute);
  const resetSeq = useRouteStore((s) => s.resetSeq);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  useEffect(() => {
    try {
      abortRef.current?.abort();
    } catch {
      // ignore abort errors when resetting chat
    }
    abortRef.current = null;
    setMessages(initialMessages());
    setInput("");
    setBusy(false);
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [resetSeq]);

  async function runAgent(allMessages: ChatMessage[]): Promise<AgentRunResult> {
    try {
      abortRef.current?.abort();
    } catch {
      // ignore abort errors before starting a new run
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: allMessages }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Agent run failed");
    const data: AgentRunResult = await res.json();
    return data;
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
      let encounteredError = false;
      const data = await runAgent(next);
      const history = data.history ?? [];
      const placeholderIndex = next.length - 1; // index of the assistant placeholder

      // If the agent called a tool, briefly reflect that status in the same bubble
      const fnCall = history.find(isFunctionCall);
      if (fnCall) {
        setMessages((m) => m.map((msg, i) => (i === placeholderIndex ? { ...msg, content: `Calling ${fnCall.name}…` } : msg)));
      }
      const plan = extractPlan(history);
      if (plan) {
        // First, ask the server to geocode all waypoint queries.
        const geoRes = await fetch("/api/geocode/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            waypointQueries: plan.waypoints.map((w) => w.query),
          }),
          signal: abortRef.current?.signal,
        });

        if (geoRes.ok) {
          const resolvedJson = await geoRes.json();
          if (!isGeoResolved(resolvedJson) || resolvedJson.waypoints.length !== plan.waypoints.length) {
            throw new Error("Geocoding mismatch");
          }
          const resolved = resolvedJson;

          // Indicate routing fetch in the same assistant bubble
          setMessages((m) =>
            m.map((msg, i) => (i === placeholderIndex ? { ...msg, content: "Fetching route…" } : msg)),
          );

          // Then fetch the route using all waypoints (in order).
          const routeRes = await fetch("/api/routing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              waypoints: resolved.waypoints.map((wp) => ({ lat: wp.lat, lon: wp.lon })),
            }),
            signal: abortRef.current?.signal,
          });

          if (routeRes.ok) {
            const routeJson = await routeRes.json();
            if (!isFeatureCollection(routeJson)) throw new Error("Invalid route");
            const route = routeJson;

            // Build combined waypoints with labels/roles
            const combined = plan.waypoints.map((w, i) => ({
              name: (w.label && w.label.trim()) || resolved.waypoints[i]?.name || w.query,
              coords: { lat: resolved.waypoints[i].lat, lon: resolved.waypoints[i].lon },
              role: w.role,
            }));
            const combinedWaypoints: Waypoint[] = combined;
            setWaypoints(combinedWaypoints);
            setRoute(route);
          } else {
            // Routing failed
            encounteredError = true;
            setMessages((m) =>
              m.map((msg, i) =>
                i === placeholderIndex
                  ? { ...msg, content: "I couldn’t fetch a route for those waypoints. Please try again." }
                  : msg,
              ),
            );
          }
        } else {
          // Geocoding failed
          encounteredError = true;
          setMessages((m) =>
            m.map((msg, i) =>
              i === placeholderIndex
                ? { ...msg, content: "I couldn’t resolve some stops. Could you be more specific?" }
                : msg,
            ),
          );
        }
      }

      // Finally, replace the placeholder content with the assistant's final text
      const finalText = lastAssistantText(history) ?? (typeof data.response === "string" ? data.response : undefined) ?? "Done.";
      if (!encounteredError) {
        setMessages((m) => m.map((msg, i) => (i === placeholderIndex ? { ...msg, content: finalText } : msg)));
      }
    } catch (err: unknown) {
      const isAbort =
        (err instanceof DOMException || err instanceof Error) && err.name === "AbortError";
      if (isAbort) {
        // Silently ignore aborts (e.g., when user cleared the chat)
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "I hit a snag talking to the agent. Please try again." },
        ]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 border-b-4 border-black"
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
      <form onSubmit={handleSubmit} className="p-3 flex gap-2 border-t-4 border-black shrink-0">
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
