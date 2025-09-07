"use client";

import type { FeatureCollection } from "geojson";
import maplibregl from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { Layer, Map, Marker, Source, type MapRef } from "react-map-gl/maplibre";

export type LatLng = { lat: number; lon: number };

export type RouteFeatureCollection = FeatureCollection;

export type MapViewProps = {
  origin?: { name?: string; coords?: LatLng };
  destination?: { name?: string; coords?: LatLng };
  route?: RouteFeatureCollection | null;
};

function FitToContent({
  origin,
  destination,
  route,
  mapRef,
}: Required<Pick<MapViewProps, "origin" | "destination" | "route">> & {
  mapRef: MapRef | null;
}) {
  useEffect(() => {
    const bounds: [number, number][] = [];
    if (origin.coords) bounds.push([origin.coords.lat, origin.coords.lon]);
    if (destination.coords) bounds.push([destination.coords.lat, destination.coords.lon]);

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
        { padding: 40 },
      );
    }
  }, [origin, destination, route, mapRef]);

  return null;
}

export function MapView({ origin, destination, route }: MapViewProps) {
  const mapRef = useRef<MapRef | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (origin?.coords) return [origin.coords.lat, origin.coords.lon];
    if (destination?.coords) return [destination.coords.lat, destination.coords.lon];
    return [37.3688, -122.0363];
  }, [origin, destination]);

  // memoized key can be used for forcing rerenders if needed
  // const routeKey = useMemo(() => JSON.stringify(route ?? {}).length, [route]);

  const [primaryRoute, altRoutes] = useMemo((): [
    FeatureCollection | null,
    FeatureCollection | null,
  ] => {
    if (!route || !Array.isArray(route.features) || route.features.length === 0) {
      return [null, null];
    }
    const [first, ...rest] = route.features;
    const primary: FeatureCollection = { type: "FeatureCollection", features: [first] };
    const alts: FeatureCollection | null =
      rest.length > 0 ? { type: "FeatureCollection", features: rest } : null;
    return [primary, alts];
  }, [route]);

  return (
    <Map
      ref={mapRef}
      mapLib={maplibregl}
      initialViewState={{ latitude: center[0], longitude: center[1], zoom: 9 }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
    >
      {origin?.coords && (
        <Marker latitude={origin.coords.lat} longitude={origin.coords.lon} anchor="bottom">
          <div className="px-2 py-1 text-xs bg-black text-white border-2 border-black">
            Start{origin.name ? `: ${origin.name}` : ""}
          </div>
        </Marker>
      )}
      {destination?.coords && (
        <Marker latitude={destination.coords.lat} longitude={destination.coords.lon} anchor="bottom">
          <div className="px-2 py-1 text-xs bg-black text-white border-2 border-black">
            Destination{destination.name ? `: ${destination.name}` : ""}
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
      {altRoutes && (
        <Source id="route-alt" type="geojson" data={altRoutes}>
          <Layer
            id="route-alt-line"
            type="line"
            paint={{ "line-color": "#777777", "line-width": 4, "line-dasharray": [8, 8], "line-opacity": 0.95 }}
          />
        </Source>
      )}

      <FitToContent
        origin={{ name: origin?.name, coords: origin?.coords }}
        destination={{ name: destination?.name, coords: destination?.coords }}
        route={route ?? null}
        mapRef={mapRef.current}
      />
    </Map>
  );
}
