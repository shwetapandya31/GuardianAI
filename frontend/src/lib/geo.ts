// GUARDIAN-AI: SOURCE TO DESTINATION ROUTING & GOOGLE MAPS GEOCODING
// UI-free location, search, reverse geocoding, and routing helpers.

import { loadGoogleMaps } from "./google-maps";

export type LatLng = { lat: number; lng: number };

export type RoutePoint = LatLng & { label: string; sublabel?: string };

/** True only for real, finite, in-range coordinates coming from Firestore. */
export function isValidCoord(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

export type RouteResult = {
  /** [lat, lng] polyline of the real road route returned by the provider. */
  coordinates: [number, number][];
  /** Metres. */
  distance: number;
  /** Seconds. */
  duration: number;
};

// GUARDIAN-AI: SOURCE TO DESTINATION ROUTING
// Real routing provider (OSRM road network). No straight lines are ever drawn as a
// route — if the provider fails, the caller surfaces the error instead.
export async function fetchRoute(source: LatLng, destination: LatLng): Promise<RouteResult> {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${source.lng},${source.lat};${destination.lng},${destination.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Routing service returned ${res.status}`);
  const data = (await res.json()) as {
    code?: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error("No route found between these points.");

  return {
    coordinates: route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]),
    distance: route.distance,
    duration: route.duration,
  };
}

export function formatDistance(metres: number): string {
  return metres < 1000 ? `${Math.round(metres)} m` : `${(metres / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)} h ${mins % 60} min`;
}

// GUARDIAN-AI: GOOGLE MAPS NAVIGATION
// URL is always built from the live selected coordinates — nothing is hardcoded.
export function googleMapsDirectionsUrl(source: LatLng, destination: LatLng): string {
  return (
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${source.lat},${source.lng}` +
    `&destination=${destination.lat},${destination.lng}` +
    `&travelmode=driving`
  );
}

/** Parse a "lat, lng" text entry typed by the operator. Returns null when invalid. */
export function parseLatLng(input: string): LatLng | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return isValidCoord(lat, lng) ? { lat, lng } : null;
}

export type PlaceResult = LatLng & { label: string };

// Address search: Uses Google Maps Geocoder with OpenStreetMap Nominatim fallback
export async function searchPlaces(query: string, limit = 5): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  try {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();
    const response = await new Promise<PlaceResult[]>((resolve) => {
      geocoder.geocode({ address: q }, (results: any[], status: string) => {
        if (status === "OK" && Array.isArray(results)) {
          const list = results.slice(0, limit).map((r) => ({
            lat: r.geometry.location.lat(),
            lng: r.geometry.location.lng(),
            label: r.formatted_address || q,
          }));
          resolve(list);
        } else {
          resolve([]);
        }
      });
    });
    if (response.length > 0) return response;
  } catch {
    // Fall back to Nominatim if Google Maps Geocoder fails
  }

  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=${limit}` +
    `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Location search failed (${res.status})`);
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return rows
    .map((r) => ({ lat: Number(r.lat), lng: Number(r.lon), label: r.display_name }))
    .filter((p) => isValidCoord(p.lat, p.lng));
}

// Reverse Geocoding: Uses Google Maps Geocoder with OpenStreetMap Nominatim fallback
export async function reverseGeocode(point: LatLng): Promise<string | null> {
  try {
    const maps = await loadGoogleMaps();
    const geocoder = new maps.Geocoder();
    const result = await new Promise<string | null>((resolve) => {
      geocoder.geocode({ location: { lat: point.lat, lng: point.lng } }, (results: any[], status: string) => {
        if (status === "OK" && results?.[0]?.formatted_address) {
          resolve(results[0].formatted_address);
        } else {
          resolve(null);
        }
      });
    });
    if (result) return result;
  } catch {
    // Fall back to Nominatim
  }

  const url =
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
    `&lat=${point.lat}&lon=${point.lng}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ?? null;
  } catch {
    return null;
  }
}
