// GUARDIAN-AI: GOOGLE MAPS CAMERA LOCATION PICKER CANVAS
// Renders Google Maps for picking physical camera installation coordinates.
// Map clicks and marker drag operations report exact coordinates back to the form.

import { useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";
import { GOOGLE_MAPS_DARK_STYLE, loadGoogleMaps } from "@/lib/google-maps";

export type PickerCanvasProps = {
  value: LatLng | null;
  onPick: (point: LatLng) => void;
};

const MARKER_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2322d3ee" stroke="%23ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="%230b0f19"/></svg>`;

export default function PickerCanvas({ value, onPick }: PickerCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    let unmounted = false;
    if (!holderRef.current) return;

    loadGoogleMaps()
      .then((maps) => {
        if (unmounted || !holderRef.current) return;

        const defaultCenter = value ? { lat: value.lat, lng: value.lng } : { lat: 20, lng: 0 };
        const map = new maps.Map(holderRef.current, {
          center: defaultCenter,
          zoom: value ? 16 : 3,
          styles: GOOGLE_MAPS_DARK_STYLE,
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        map.addListener("click", (e: any) => {
          if (!e.latLng) return;
          pickRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() });
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
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const win = typeof window !== "undefined" ? (window as any) : {};
    if (!map || !win.google?.maps) return;
    const maps = win.google.maps;

    if (!value) {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      return;
    }

    const pos = { lat: value.lat, lng: value.lng };

    if (!markerRef.current) {
      const marker = new maps.Marker({
        position: pos,
        map,
        draggable: true,
        title: "Drag to set camera location",
        icon: {
          url: MARKER_SVG,
          scaledSize: new maps.Size(32, 32),
          anchor: new maps.Point(16, 32),
        },
      });

      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        if (p) pickRef.current({ lat: p.lat(), lng: p.lng() });
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setPosition(pos);
    }

    map.panTo(pos);
    if (map.getZoom() < 14) map.setZoom(16);
  }, [value]);

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
