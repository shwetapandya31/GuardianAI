import type { Camera } from "./types";

export const CAMERA_HEARTBEAT_THRESHOLD_MS = 20_000; // 20 seconds

export function toCameraDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const maybe = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof maybe.toDate === "function") {
    try {
      return maybe.toDate();
    } catch {
      // fallback if toDate fails
    }
  }
  if (typeof maybe.seconds === "number") return new Date(maybe.seconds * 1000);
  if (typeof maybe._seconds === "number") return new Date(maybe._seconds * 1000);
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function isCameraActive(
  camera?: Partial<Camera> | null,
  thresholdMs = CAMERA_HEARTBEAT_THRESHOLD_MS,
  nowMs = Date.now(),
): boolean {
  if (!camera) return false;
  if (camera.enabled === false) return false;

  const date = toCameraDate(camera.lastSeen);
  if (!date) return false;

  const ageMs = nowMs - date.getTime();
  return ageMs >= 0 && ageMs <= thresholdMs;
}

export function getCameraStatusLabel(camera?: Partial<Camera> | null, nowMs = Date.now()): "Active" | "Offline" {
  return isCameraActive(camera, CAMERA_HEARTBEAT_THRESHOLD_MS, nowMs) ? "Active" : "Offline";
}
