// GUARDIAN-AI: GOOGLE MAPS INCIDENT MAP CANVAS
// Browser-only Google Maps canvas rendering real incident alerts, camera markers,
// selection popups, and OSRM road polyline routes.

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";
import { GOOGLE_MAPS_DARK_STYLE, loadGoogleMaps } from "@/lib/google-maps";

export type MapMarker = {
  id: string;
  kind: "incident" | "camera" | "source" | "destination";
  lat: number;
  lng: number;
  title: string;
  lines: string[];
  selected?: boolean;
  actions?: { label: string; onClick: () => void }[];
};

export type MapCanvasProps = {
  markers: MapMarker[];
  center: LatLng | null;
  focus: (LatLng & { key: string }) | null;
  route: [number, number][] | null;
  onMarkerClick?: (id: string) => void;
};

const COLORS: Record<MapMarker["kind"], string> = {
  incident: "%23ef4444",
  camera: "%2322d3ee",
  source: "%23f59e0b",
  destination: "%2322c55e",
};

function getMarkerSvg(kind: MapMarker["kind"], selected = false) {
  const fill = COLORS[kind] || "%2322d3ee";
  const size = selected ? 36 : 28;
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="%230b0f19"/></svg>`;
}

export default function MapCanvas({ markers, center, focus, route, onMarkerClick }: MapCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const activeMarkersRef = useRef<Map<string, { marker: any; infoWindow: any }>>(new Map());
  const routePolylineRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onMarkerClickRef = useRef(onMarkerClick);
  onMarkerClickRef.current = onMarkerClick;

  // 1. Initialize Map
  useEffect(() => {
    let unmounted = false;
    if (!holderRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (unmounted || !holderRef.current) return;

        const defaultCenter = center ? { lat: center.lat, lng: center.lng } : { lat: 20, lng: 0 };
        const map = new maps.Map(holderRef.current, {
          center: defaultCenter,
          zoom: center ? 14 : 3,
          styles: GOOGLE_MAPS_DARK_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
      })
      .catch((err) => {
        if (!unmounted) {
          setError(err instanceof Error ? err.message : "Failed to load Google Maps");
        }
      });

    return () => {
      unmounted = true;
      activeMarkersRef.current.forEach(({ marker, infoWindow }) => {
        infoWindow?.close();
        marker?.setMap(null);
      });
      activeMarkersRef.current.clear();

      if (routePolylineRef.current) {
        routePolylineRef.current.setMap(null);
        routePolylineRef.current = null;
      }

      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Render Markers & InfoWindows
  useEffect(() => {
    const map = mapRef.current;
    const win = typeof window !== "undefined" ? (window as any) : {};
    if (!map || !win.google?.maps) return;
    const maps = win.google.maps;

    // Remove obsolete markers
    const currentIds = new Set(markers.map((m) => m.id));
    activeMarkersRef.current.forEach((val, id) => {
      if (!currentIds.has(id)) {
        val.infoWindow?.close();
        val.marker?.setMap(null);
        activeMarkersRef.current.delete(id);
      }
    });

    // Create or update markers
    markers.forEach((m) => {
      const pos = { lat: m.lat, lng: m.lng };
      const svgUrl = getMarkerSvg(m.kind, m.selected);
      const icon = {
        url: svgUrl,
        scaledSize: new maps.Size(m.selected ? 36 : 28, m.selected ? 36 : 28),
        anchor: new maps.Point(m.selected ? 18 : 14, m.selected ? 36 : 28),
      };

      let existing = activeMarkersRef.current.get(m.id);

      if (!existing) {
        const marker = new maps.Marker({
          position: pos,
          map,
          title: m.title,
          icon,
        });

        const actionsId = `ga-actions-${m.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const content =
          `<div style="min-width:180px;font-family:sans-serif;color:#0f172a;padding:2px">` +
          `<strong style="display:block;margin-bottom:4px;font-size:13px;color:#0f172a">${escapeHtml(m.title)}</strong>` +
          m.lines.map((l) => `<div style="font-size:11px;color:#475569">${escapeHtml(l)}</div>`).join("") +
          `<div id="${actionsId}" style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"></div></div>`;

        const infoWindow = new maps.InfoWindow({ content });

        infoWindow.addListener("domready", () => {
          const container = document.getElementById(actionsId);
          if (!container) return;
          container.innerHTML = "";
          (m.actions ?? []).forEach((a) => {
            const btn = document.createElement("button");
            btn.textContent = a.label;
            btn.style.cssText =
              "font-size:11px;font-weight:600;padding:4px 8px;border-radius:6px;border:1px solid #0284c7;background:#0284c7;color:#ffffff;cursor:pointer";
            btn.onclick = () => {
              a.onClick();
              infoWindow.close();
            };
            container.appendChild(btn);
          });
        });

        marker.addListener("click", () => {
          onMarkerClickRef.current?.(m.id);
          infoWindow.open(map, marker);
        });

        existing = { marker, infoWindow };
        activeMarkersRef.current.set(m.id, existing);
      } else {
        existing.marker.setPosition(pos);
        existing.marker.setIcon(icon);
      }

      if (m.selected && existing.infoWindow) {
        existing.infoWindow.open(map, existing.marker);
      }
    });
  }, [markers]);

  // 3. Focus / Pan
  useEffect(() => {
    const map = mapRef.current;
    if (!focus || !map) return;
    map.panTo({ lat: focus.lat, lng: focus.lng });
    map.setZoom(16);
  }, [focus]);

  // 4. Route Polyline
  useEffect(() => {
    const map = mapRef.current;
    const win = typeof window !== "undefined" ? (window as any) : {};
    if (!map || !win.google?.maps) return;
    const maps = win.google.maps;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }

    if (route && route.length > 1) {
      const path = route.map(([lat, lng]) => ({ lat, lng }));
      const polyline = new maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#38bdf8",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      });

      polyline.setMap(map);
      routePolylineRef.current = polyline;

      const bounds = new maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
    }
  }, [route]);

  if (error) {
    return (
      <div className="grid size-full place-items-center p-4 text-center text-xs text-muted-foreground">
        <div>
          <p className="font-semibold text-critical">Google Maps Error</p>
          <p className="mt-1 max-w-xs">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={holderRef} className="size-full" />;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}
