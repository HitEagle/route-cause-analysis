"use client";

import { Chat, type ChatOutcome } from "@/components/Chat";
import { MapView, type RouteFeatureCollection } from "@/components/MapView";
import { useState } from "react";

export default function Home() {
  const [origin, setOrigin] = useState<{ name?: string; coords?: { lat: number; lon: number } }>();
  const [destination, setDestination] = useState<{ name?: string; coords?: { lat: number; lon: number } }>();
  const [route, setRoute] = useState<RouteFeatureCollection | null>(null);

  function handleResolved(outcome: ChatOutcome) {
    setOrigin({ name: outcome.origin.name, coords: outcome.origin.coords });
    setDestination({ name: outcome.destination.name, coords: outcome.destination.coords });
    setRoute(outcome.route as RouteFeatureCollection);
  }

  return (
    <div className="h-[100vh] bg-[#f8f8f6] p-4 md:p-6">
      <div className="h-full grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4 md:gap-6">
        <div className="brutalist-card bg-white h-full">
          <MapView origin={origin} destination={destination} route={route ?? undefined} />
        </div>

        <div className="brutalist-card bg-white h-full flex flex-col">
          <header className="p-4 border-b-4 border-black">
            <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">Route Planner</h1>
          </header>
          <div className="flex-1 min-h-0">
            <Chat onResolved={handleResolved} />
          </div>
        </div>
      </div>
    </div>
  );
}
