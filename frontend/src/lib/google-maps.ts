// GUARDIAN-AI: GOOGLE MAPS JS API LOADER
// Dynamically loads the Google Maps JavaScript SDK using environment configuration.
// No API key is hardcoded.

let loadPromise: Promise<any> | null = null;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in browser environment."));
  }

  const win = window as any;

  if (win.google?.maps) {
    return Promise.resolve(win.google.maps);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const env = import.meta.env as Record<string, string | undefined>;
    const apiKey =
      env["VITE_GOOGLE_MAPS_API_KEY"] ||
      env["VITE_GOOGLE_API_KEY"] ||
      (typeof process !== "undefined" ? process.env["GOOGLE_API_KEY"] : undefined);

    if (!apiKey) {
      reject(new Error("Google Maps API Key is missing. Configure VITE_GOOGLE_MAPS_API_KEY in frontend/.env"));
      return;
    }

    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(win.google?.maps));
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google Maps script.")));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(win.google?.maps);
    script.onerror = () =>
      reject(
        new Error(
          "Failed to load Google Maps JavaScript API script. Check internet connection and API key configuration.",
        ),
      );
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Dark map style custom-tailored for GuardianAI glassmorphic UI
export const GOOGLE_MAPS_DARK_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0b0f19" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f19" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#334155" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0284c7" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
];
