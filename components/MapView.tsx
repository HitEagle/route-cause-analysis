"use client";

import { useRouteStore, type Waypoint, type RouteFeatureCollection } from "@/lib/routeStore";
import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { Layer, Map, Marker, Source, type MapRef } from "react-map-gl/maplibre";

export type MapViewProps = {
  boundsPadding?: number | { top: number; right: number; bottom: number; left: number };
};

function FitToContent({
  waypoints,
  route,
  mapRef,
  padding,
}: {
  waypoints: Waypoint[];
  route: RouteFeatureCollection | null;
  mapRef: MapRef | null;
  padding: number | { top: number; right: number; bottom: number; left: number };
}) {
  useEffect(() => {
    const bounds: [number, number][] = [];
    for (const wp of waypoints) {
      if (wp.coords) bounds.push([wp.coords.lat, wp.coords.lon]);
    }

    if (route && (route.features?.length ?? 0) > 0) {
      for (const feature of route.features) {
        if (feature.geometry.type === "LineString") {
          const line = feature.geometry.coordinates as [number, number][]; // [lon,lat]
          line.forEach((c) => bounds.push([c[1], c[0]]));
        }
        if (feature.geometry.type === "MultiLineString") {
          const multi = feature.geometry.coordinates as [number, number][][];
          multi.forEach((ls) => ls.forEach((c) => bounds.push([c[1], c[0]])));
        }
      }
    }

    if (bounds.length > 0 && mapRef?.getMap()) {
      const lats = bounds.map((b) => b[0]);
      const lons = bounds.map((b) => b[1]);
      const south = Math.min(...lats);
      const north = Math.max(...lats);
      const west = Math.min(...lons);
      const east = Math.max(...lons);
      mapRef.getMap().fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding },
      );
    }
  }, [waypoints, route, mapRef, padding]);

  return null;
}

export function MapView({ boundsPadding }: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null);

  // Read from the shared store
  const wps = useRouteStore((s) => s.waypoints) as Waypoint[];
  const rt = useRouteStore((s) => s.route) as RouteFeatureCollection | null;

  const center = useMemo<[number, number]>(() => {
    const first = wps.find((w) => !!w.coords);
    if (first?.coords) return [first.coords.lat, first.coords.lon];
    return [37.3688, -122.0363];
  }, [wps]);

  const primaryRoute = useMemo((): FeatureCollection | null => {
    if (!rt || !Array.isArray(rt.features) || rt.features.length === 0) {
      return null;
    }
    const [first] = rt.features;
    return { type: "FeatureCollection", features: [first] };
  }, [rt]);

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      initialViewState={{ latitude: center[0], longitude: center[1], zoom: 9 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      {wps.length > 0 && wps[0]?.coords && (
        <Marker latitude={wps[0].coords!.lat} longitude={wps[0].coords!.lon} anchor="bottom">
          <div className="px-2 py-1 text-xs bg-black text-white border-2 border-black">
            Start{wps[0].name ? `: ${wps[0].name}` : ""}
          </div>
        </Marker>
      )}
      {wps.length > 1 && wps[wps.length - 1]?.coords && (
        <Marker
          latitude={wps[wps.length - 1].coords!.lat}
          longitude={wps[wps.length - 1].coords!.lon}
          anchor="bottom"
        >
          <div className="px-2 py-1 text-xs bg-black text-white border-2 border-black">
            End{wps[wps.length - 1].name ? `: ${wps[wps.length - 1].name}` : ""}
          </div>
        </Marker>
      )}

      {primaryRoute && (
        <Source id="route-primary" type="geojson" data={primaryRoute}>
          <Layer
            id="route-primary-line"
            type="line"
            paint={{ "line-color": "#000000", "line-width": 6, "line-opacity": 0.95 }}
          />
        </Source>
      )}

      <FitToContent
        waypoints={wps}
        route={primaryRoute ?? null}
        mapRef={mapRef.current}
        padding={
          boundsPadding ?? {
            top: 50,
            right: 50,
            bottom: 50,
            left: 50,
          }
        }
      />
    </Map>
  );
}
