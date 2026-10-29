import { useEffect, useState } from "react";
import { onSnapshot, type DocumentData } from "firebase/firestore";
import { isFirebaseConfigured, sharedAlertCollection, sharedCameraCollection } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { Alert, Camera } from "@/lib/types";

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybe.toDate === "function") return maybe.toDate();
  if (typeof maybe.seconds === "number") return new Date(maybe.seconds * 1000);
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : (value as number);
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
}

function mapAlert(id: string, d: DocumentData): Alert {
  return {
    id,
    // GUARDIAN-AI: FIREBASE EVIDENCE IMAGE — real Storage URL written by the backend.
    image: d["image_url"] ?? d["imageUrl"] ?? d["image"] ?? d["imageURL"] ?? d["snapshot"] ?? "",
    message: d["message"] ?? d["title"] ?? "Alert detected",
    cameraId: d["cameraId"] ?? d["camera_id"] ?? d["camera"] ?? "—",
    confidence: num(d["confidence"]) ?? 0,
    status: d["status"] ?? "pending",
    timestamp: toDate(d["timestamp"] ?? d["createdAt"] ?? d["time"]),
    latitude: num(d["latitude"] ?? d["lat"]),
    longitude: num(d["longitude"] ?? d["lng"] ?? d["lon"]),
  };
}

function mapCamera(id: string, d: DocumentData): Camera {
  return {
    id,
    cameraId: d["cameraId"] ?? d["camera_id"] ?? id,
    name: d["name"] ?? d["cameraId"] ?? id,
    location: d["location"] ?? d["locationName"] ?? d["location_name"] ?? "",
    streamUrl: d["streamUrl"] ?? d["stream_url"] ?? "",
    // GUARDIAN-AI: REAL CAMERA HEALTH STATUS — pass the backend-written status through
    // unchanged; "unknown" when the document has no status field yet.
    status: d["status"] ?? "unknown",
    // Accepts `lastSeen`, `last_seen`, or the future `lastHeartbeat` backend field.
    lastSeen: toDate(d["lastSeen"] ?? d["last_seen"] ?? d["lastHeartbeat"]),
    latitude: num(d["latitude"] ?? d["lat"]),
    longitude: num(d["longitude"] ?? d["lng"] ?? d["lon"]),
  };
}

type Result<T> = { data: T[]; loading: boolean; error: string | null };

export function useAlerts(max = 50, refreshKey = 0): Result<Alert> {
  const [state, setState] = useState<Result<Alert>>({ data: [], loading: true, error: null });

  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState({ data: [], loading: false, error: "Firebase is not configured yet." });
      return;
    }
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    // GUARDIAN-AI: REAL-TIME FIRESTORE NOTIFICATIONS
    // Single onSnapshot listener on the shared `alerts` collection; it is torn down by
    // the returned unsubscribe on unmount, so there are never duplicate listeners.
    // Sorting happens client-side so documents are included whether the backend wrote
    // `timestamp` or `createdAt`.
    return onSnapshot(
      sharedAlertCollection(),
      (snap) => {
        const rows = snap.docs
          .map((doc) => mapAlert(doc.id, doc.data()))
          .sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))
          .slice(0, max);
        setState({ data: rows, loading: false, error: null });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [max, refreshKey, uid]);

  return state;
}

// GUARDIAN-AI: SHARED FIRESTORE CAMERA REGISTRATION
// Cameras are station-wide: every authenticated operator subscribes to the SAME
// top-level `cameras` collection. Alerts stay per-user; cameras do not.
// GUARDIAN-AI: REAL-TIME CAMERA STATUS — onSnapshot keeps tiles in sync with the
// backend-written `status` field; no polling, no manual refresh.
export function useCameras(refreshKey = 0): Result<Camera> {
  const [state, setState] = useState<Result<Camera>>({ data: [], loading: true, error: null });

  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setState({ data: [], loading: false, error: "Firebase is not configured yet." });
      return;
    }
    if (!uid) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      sharedCameraCollection(),
      (snap) => {
        setState({
          data: snap.docs.map((doc) => mapCamera(doc.id, doc.data())),
          loading: false,
          error: null,
        });
      },
      (err) => setState({ data: [], loading: false, error: err.message }),
    );
  }, [refreshKey, uid]);

  return state;
}

/** Live total count of the alerts collection (not limited by the feed page size). */
export function useAlertCount(refreshKey = 0): { count: number; loading: boolean } {
  const [state, setState] = useState({ count: 0, loading: true });

  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!isFirebaseConfigured || !uid) {
      setState({ count: 0, loading: false });
      return;
    }
    return onSnapshot(
      sharedAlertCollection(),
      (snap) => setState({ count: snap.size, loading: false }),
      () => setState({ count: 0, loading: false }),
    );
  }, [refreshKey, uid]);

  return state;
}
