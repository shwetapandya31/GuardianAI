// GUARDIAN-AI: LIVE CAMERA MONITORING
// Firestore `cameras` (users/{uid}/cameras) is the SINGLE SOURCE OF TRUTH.
// Dashboard only renders <LiveCamera cameras={...} /> — no camera logic lives there.
//
// GUARDIAN-AI: BACKEND STREAM INTEGRATION POINT
// RTSP/IP cameras cannot play directly in a browser. When the Python backend relays
// a browser-compatible stream (HLS / WebRTC / MJPEG), map it in `toMonitorCamera()`
// below — the tile UI needs no changes.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  Camera as CameraIcon,
  Cctv,
  ChevronLeft,
  ChevronRight,
  Circle,
  Maximize2,
  MonitorPlay,
  Power,
  PowerOff,
  Radio,
  ScanEye,
  VideoOff,
} from "lucide-react";
import { toast } from "sonner";
import type { Camera } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isCameraActive } from "@/lib/cameraUtils";

// GUARDIAN-AI: BACKEND MJPEG STREAM
// Stream-type abstraction. The Python backend serves an HTTP multipart MJPEG feed
// (e.g. http://127.0.0.1:8000/video_feed) which must render in an <img>, never a
// <video>. RTSP can never play directly in a browser and stays "unplayable" until a
// browser-compatible relay URL (MJPEG / HLS / WebRTC) is registered for the camera.
export type CameraSourceKind = "mjpeg" | "video" | "hls" | "unplayable";

// GUARDIAN-AI: REAL CAMERA HEALTH STATUS
// Status is derived from lastSeen freshness.
export type CameraHealth = "online" | "offline" | "connecting" | "error" | "unknown";

export type MonitorCamera = {
  id: string;
  cameraId: string;
  name: string;
  location: string;
  status: string;
  health: CameraHealth;
  /** Populated only when Firestore provides lastSeen/lastHeartbeat. Never invented. */
  lastSeen?: Date | null;
  sourceKind: CameraSourceKind;
  /** Browser-playable URL (MJPEG endpoint, mp4/webm/ogg, or backend HLS). */
  sourceUrl?: string | undefined;
};

/** Normalize the backend-supplied Firestore `status` string to a health state. */
export function normalizeHealth(status: string | null | undefined): CameraHealth {
  const s = (status || "").trim().toLowerCase();
  if (s === "active" || s === "online") return "online";
  if (s === "offline" || s === "disconnected") return "offline";
  if (s === "connecting" || s === "reconnecting" || s === "starting") return "connecting";
  if (s === "error" || s === "failed" || s === "fault") return "error";
  return "unknown";
}

/** Relative "Last seen" label from the backend-provided heartbeat field. */
export function lastSeenLabel(lastSeen: Date | null | undefined, now: number): string | null {
  if (!lastSeen) return null;
  const seconds = Math.max(0, Math.round((now - lastSeen.getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** Real detection data will arrive from the backend/Firestore later. Never simulated. */
export type Detection = {
  type: string;
  confidence: number;
  timestamp?: Date | null;
};

/**
 * GUARDIAN-AI: REAL FIRESTORE CAMERA GRID
 * Firestore camera document -> monitor tile. Derived health from lastSeen.
 */
function toMonitorCamera(camera: Camera, nowMs: number): MonitorCamera {
  const url = (camera.streamUrl || "").trim();
  // GUARDIAN-AI: BACKEND MJPEG STREAM — classify the registered stream URL.
  let sourceKind: CameraSourceKind = "unplayable";
  if (/^https?:\/\//i.test(url)) {
    if (/\.(mp4|webm|ogg)(\?|$)/i.test(url)) sourceKind = "video";
    else if (/\.m3u8(\?|$)/i.test(url)) sourceKind = "hls";
    // Any other plain HTTP endpoint is treated as a backend multipart MJPEG feed.
    else sourceKind = "mjpeg";
  }

  const active = isCameraActive(camera, undefined, nowMs);

  return {
    id: camera.id,
    cameraId: camera.cameraId,
    name: camera.name || camera.cameraId,
    location: camera.location || "Unknown location",
    status: active ? "active" : "offline",
    health: active ? "online" : "offline",
    lastSeen: camera.lastSeen ?? null,
    sourceKind,
    sourceUrl: sourceKind === "unplayable" ? undefined : url,
  };
}

const PAGE_SIZE = 4;

export function LiveCamera({ cameras = [] }: { cameras?: Camera[] }) {
  // Tick every 15s so backend-provided "Last seen" labels and derived health stay fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const list = useMemo<MonitorCamera[]>(
    () => cameras.map((c) => toMonitorCamera(c, now)),
    [cameras, now],
  );

  // GUARDIAN-AI: CAMERA NAVIGATION (4 per view, arrows + swipe)
  const pageCount = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);

  const go = useCallback(
    (dir: 1 | -1) => setPage((p) => Math.min(pageCount - 1, Math.max(0, p + dir))),
    [pageCount],
  );

  const dragX = useRef<number | null>(null);
  function onPointerDown(e: React.PointerEvent) {
    dragX.current = e.clientX;
  }
  function onPointerUp(e: React.PointerEvent) {
    const start = dragX.current;
    dragX.current = null;
    if (start == null) return;
    const dx = e.clientX - start;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
  }

  const start = page * PAGE_SIZE;
  const visible = list.slice(start, start + PAGE_SIZE);

  return (
    <section>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-lg font-bold">Live Camera Monitoring</h2>
          <p className="text-xs text-muted-foreground">
            Registered cameras from your Camera Network — no demo or sample feeds.
          </p>
        </div>
        {list.length > PAGE_SIZE ? (
          <div className="flex shrink-0 items-center gap-2">
            <span className="font-mono text-[11px] text-muted-foreground">
              {start + 1}–{Math.min(start + PAGE_SIZE, list.length)} of {list.length}
            </span>
            <NavButton icon={ChevronLeft} label="Previous cameras" onClick={() => go(-1)} disabled={page === 0} />
            <NavButton
              icon={ChevronRight}
              label="Next cameras"
              onClick={() => go(1)}
              disabled={page >= pageCount - 1}
            />
          </div>
        ) : null}
      </div>

      {list.length === 0 ? (
        <div className="glass mt-3 rounded-2xl px-6 py-10 text-center">
          <Cctv className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-display text-sm font-bold">No cameras connected</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            Add and connect cameras from Camera Network to begin monitoring.
          </p>
          <Link
            to="/cameras"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground"
          >
            <Cctv className="size-3.5" /> Manage Cameras
          </Link>
        </div>
      ) : (
        <>
          <div
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            className="mt-3 grid touch-pan-y gap-3 sm:grid-cols-2"
          >
            {visible.map((cam, i) => (
              <CameraTile key={cam.id} camera={cam} index={i} now={now} />
            ))}
          </div>

          {pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Camera page ${i + 1}`}
                  onClick={() => setPage(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === page ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40",
                  )}
                />
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

// GUARDIAN-AI: REAL CAMERA HEALTH STATUS
// Derived health badge showing ACTIVE / OFFLINE based on lastSeen timestamp.
function CameraTile({ camera, index, now }: { camera: MonitorCamera; index: number; now: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // GUARDIAN-AI: CAMERA VIEW ON/OFF
  const [viewOn, setViewOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [streamFailed, setStreamFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const health = camera.health;
  const hasStream = camera.sourceKind !== "unplayable";
  const lastSeen = lastSeenLabel(camera.lastSeen, now);

  const attached = viewOn && hasStream && !streamFailed;
  const feedLive = attached && connected;

  useEffect(() => {
    if (!viewOn) {
      setConnected(false);
      setStreamFailed(false);
      if (imgRef.current) imgRef.current.removeAttribute("src");
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.removeAttribute("src");
        v.load();
      }
    }
  }, [viewOn]);

  const streamSrc =
    camera.sourceUrl && attached
      ? camera.sourceUrl + (camera.sourceUrl.includes("?") ? "&" : "?") + `guardianai=${attempt}`
      : undefined;

  // REAL-TIME CAMERA STREAM STATUS:
  // The header badge reflects the camera's live connection state.
  // If stream is attached/connected without error, or if lastSeen is fresh: ACTIVE.
  // If stream fails or is unavailable/disconnected: OFFLINE.
  const isBadgeActive = !streamFailed && (attached || isCameraActive(camera, undefined, now));

  const healthBadge = isBadgeActive
    ? { cls: "border-success/40 bg-success/15 text-success", dot: "bg-success", label: "Active" }
    : { cls: "border-border/70 bg-secondary/50 text-muted-foreground", dot: "bg-muted-foreground", label: "Offline" };

  async function toggleFullscreen() {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else await el.requestFullscreen?.().catch(() => toast.error("Fullscreen unavailable."));
  }

  function takeSnapshot() {
    const img = imgRef.current;
    const video = videoRef.current;
    let width = 0;
    let height = 0;
    let source: CanvasImageSource | null = null;
    if (feedLive && video && video.videoWidth) {
      source = video;
      width = video.videoWidth;
      height = video.videoHeight;
    } else if (feedLive && img && img.naturalWidth) {
      source = img;
      width = img.naturalWidth;
      height = img.naturalHeight;
    }
    if (!source) {
      toast.error("No live frame available.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0, width, height);
    try {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${camera.cameraId}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Snapshot saved.");
      }, "image/png");
    } catch {
      toast.error("Snapshot blocked by the camera server (no CORS headers).");
    }
  }

  const streamBadge = !viewOn
    ? { label: "View Off", cls: "bg-black/70 text-white/80" }
    : !hasStream
      ? { label: "Stream Unavailable", cls: "bg-black/70 text-white/80" }
      : streamFailed
        ? { label: "Stream Unavailable", cls: "bg-critical/80 text-white" }
        : feedLive
          ? { label: "Live", cls: "bg-critical/90 text-white" }
          : { label: "Connecting", cls: "bg-black/70 text-white/80" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.2), duration: 0.25 }}
      className="glass overflow-hidden rounded-2xl"
    >
      {/* Header strip */}
      <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
        <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/50 text-cyan">
          <Cctv className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xs font-bold">{camera.name}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            <span className="font-mono">{camera.cameraId}</span> · {camera.location}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
            healthBadge.cls,
          )}
        >
          <span className={cn("size-1.5 rounded-full", healthBadge.dot)} />
          {healthBadge.label}
        </span>
      </div>

      {/* Video area */}
      <div ref={shellRef} className="relative aspect-video w-full bg-black">
        {attached && streamSrc && camera.sourceKind === "mjpeg" ? (
          <img
            ref={imgRef}
            src={streamSrc}
            alt={`Live view from ${camera.name} at ${camera.location}`}
            className="size-full object-cover"
            onLoad={() => setConnected(true)}
            onError={() => {
              setConnected(false);
              setStreamFailed(true);
            }}
          />
        ) : attached && streamSrc ? (
          <video
            ref={videoRef}
            src={streamSrc}
            className="size-full object-cover"
            autoPlay
            muted
            playsInline
            onPlaying={() => setConnected(true)}
            onPause={() => setConnected(false)}
            onError={() => {
              setConnected(false);
              setStreamFailed(true);
            }}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center p-4 text-center">
            <div>
              <VideoOff
                className={cn(
                  "mx-auto size-6",
                  health === "error" ? "text-critical" : health === "connecting" ? "animate-pulse text-warning" : "text-white/50",
                )}
              />
              <p className="mt-2 text-xs font-semibold text-white">
                {!viewOn
                  ? "Camera view disabled"
                  : streamFailed
                    ? "Stream unavailable"
                    : !hasStream
                      ? "Waiting for camera stream"
                      : "Connecting to stream…"}
              </p>
              <p className="mx-auto mt-1 max-w-[16rem] text-[10px] text-white/60">
                {!viewOn
                  ? "The operator turned this view off. The camera stays registered and its health is still monitored."
                  : !hasStream
                    ? "RTSP / IP feeds cannot play directly in a browser. Register a backend relay URL (MJPEG, HLS or WebRTC) for this camera."
                    : streamFailed
                      ? "The browser could not reach this stream. Backend camera health is reported separately above."
                      : "Requesting frames from the registered stream URL."}
              </p>
              {lastSeen ? (
                <p className="mt-2 font-mono text-[10px] text-white/50">Last seen: {lastSeen}</p>
              ) : null}
              {streamFailed && viewOn ? (
                <button
                  type="button"
                  onClick={() => {
                    setStreamFailed(false);
                    setAttempt((a) => a + 1);
                  }}
                  className="mt-3 rounded-lg border border-white/25 px-2.5 py-1 text-[10px] font-semibold text-white/80"
                >
                  Retry stream
                </button>
              ) : null}
            </div>
          </div>
        )}

        <span
          className={cn(
            "pointer-events-none absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            streamBadge.cls,
          )}
        >
          {feedLive ? <Circle className="size-2 animate-pulse fill-current" /> : null}
          {streamBadge.label}
        </span>

        {/* GUARDIAN-AI: AI DETECTION OVERLAY */}
        <div
          id={`guardian-ai-detection-overlay-${camera.id}`}
          className="guardian-ai-detection-overlay pointer-events-none absolute inset-0"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-2 rounded-lg border border-white/10" />
        <span className="pointer-events-none absolute bottom-2 right-2 font-mono text-[10px] text-white/60">
          {camera.cameraId}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5">
        <button
          type="button"
          aria-pressed={viewOn}
          onClick={() => {
            setViewOn((v) => !v);
            setAttempt((a) => a + 1);
            setStreamFailed(false);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold uppercase transition-colors",
            viewOn
              ? "border-success/40 bg-success/15 text-success"
              : "border-border/70 bg-secondary/50 text-muted-foreground",
          )}
        >
          {viewOn ? <Power className="size-3.5" /> : <PowerOff className="size-3.5" />}
          {viewOn ? "View On" : "View Off"}
        </button>
        <ControlButton icon={Maximize2} label="Fullscreen" onClick={toggleFullscreen} />
        <ControlButton icon={CameraIcon} label="Snapshot" onClick={takeSnapshot} />
        <span className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground">
          <MonitorPlay className="size-3" /> {hasStream ? camera.sourceKind : "no stream"}
        </span>
      </div>

      {/* AI detection + health status */}
      <div className="grid grid-cols-2 gap-2 border-t border-border/60 px-3 py-3">
        <DetailRow
          label="AI Status"
          value={feedLive ? "MONITORING" : "STANDBY"}
          icon={<ScanEye className="size-3" />}
          accent
        />
        <DetailRow label="Detection" value="None" />
        <DetailRow label="Confidence" value="—" />
        <DetailRow label="Location" value={camera.location} />
        {lastSeen ? <DetailRow label="Last Seen" value={lastSeen} /> : null}
        <p className="col-span-2 text-[10px] text-muted-foreground">
          <Radio className="mr-1 inline size-3" />
          Status and detections are supplied by the backend — nothing here is simulated.
        </p>
      </div>
    </motion.div>
  );
}

function NavButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-xl border border-border/70 bg-secondary/50 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
    >
      <Icon className="size-4" />
    </button>
  );
}

function ControlButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/50 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function DetailRow({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-border/60 bg-secondary/30 px-2.5 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 flex items-center gap-1.5 truncate font-mono text-[11px] font-bold",
          accent ? "text-cyan" : "text-foreground",
        )}
      >
        {icon} <span className="truncate">{value}</span>
      </p>
    </div>
  );
}
