import type { FeatureCollection } from "geojson";
import { create } from "zustand";

export type LatLng = { lat: number; lon: number };

export type RouteFeatureCollection = FeatureCollection;

export type Waypoint = {
  name?: string;
  coords?: LatLng;
  role?: "start" | "via" | "end";
};

type RouteState = {
  waypoints: Waypoint[];
  route: RouteFeatureCollection | null;
  resetSeq: number;
  setWaypoints: (wps: Waypoint[]) => void;
  setRoute: (route: RouteFeatureCollection | null) => void;
  resetAll: () => void;
};

export const useRouteStore = create<RouteState>((set, get) => ({
  waypoints: [],
  route: null,
  resetSeq: 0,
  setWaypoints: (wps) => set({ waypoints: wps }),
  setRoute: (route) => set({ route }),
  resetAll: () => set({ waypoints: [], route: null, resetSeq: get().resetSeq + 1 }),
}));
