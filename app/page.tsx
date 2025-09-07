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
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[2fr_1fr]">
      <div className="border-r-4 border-black h-[60vh] md:h-auto md:min-h-screen">
        <MapView origin={origin} destination={destination} route={route ?? undefined} />
      </div>
      <div className="min-h-[40vh] md:min-h-screen flex flex-col" style={{ background: "#fefefe" }}>
        <header className="p-4 border-b-4 border-black">
          <h1 className="text-2xl font-extrabold uppercase tracking-tight">Route Planner</h1>
          <p className="text-xs text-gray-600">Brutalist, bold, and to the point.</p>
        </header>
        <div className="flex-1">
          <Chat onResolved={handleResolved} />
        </div>
      </div>
    </div>
  );
}
