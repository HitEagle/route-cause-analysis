"use client";

import { Chat } from "@/components/Chat";
import { MapView } from "@/components/MapView";
import { useRouteStore } from "@/lib/routeStore";

export default function Home() {
  const resetAll = useRouteStore((s) => s.resetAll);

  return (
    <div className="h-[100svh] box-border overflow-hidden bg-[#f8f8f6] p-4 md:p-6">
      <div className="h-full min-h-0 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-6">
        <div className="brutalist-card bg-white">
          <MapView />
        </div>

        <div className="brutalist-card bg-white min-h-0 flex flex-col">
          <header className="p-4 border-b-4 border-black flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">Route Cause Analysis</h1>
            <button
              type="button"
              onClick={resetAll}
              className="px-4 py-2 bg-black text-white border-4 border-black hover:bg-white hover:text-black transition-colors"
              aria-label="Clear conversation"
            >
              Clear
            </button>
          </header>
          <div className="flex-1 min-h-0">
            <Chat />
          </div>
        </div>
      </div>
    </div>
  );
}
