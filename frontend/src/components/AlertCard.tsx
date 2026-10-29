import { motion } from "framer-motion";
import { Camera, MapPin, ImageOff, Map as MapIcon } from "lucide-react";
import { isValidCoord } from "@/lib/geo";
import { formatConfidence, formatCoord, formatTime } from "@/lib/format";
import { severityOf, type Alert } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE = {
  critical: {
    ring: "border-critical/50",
    text: "text-critical",
    chip: "bg-critical/15 text-critical border-critical/40",
    bar: "bg-critical",
  },
  warning: {
    ring: "border-warning/50",
    text: "text-warning",
    chip: "bg-warning/15 text-warning border-warning/40",
    bar: "bg-warning",
  },
  info: {
    ring: "border-primary/40",
    text: "text-primary",
    chip: "bg-primary/15 text-primary border-primary/40",
    bar: "bg-primary",
  },
} as const;

export function AlertCard({
  alert,
  index = 0,
  onViewOnMap,
}: {
  alert: Alert;
  index?: number;
  // GUARDIAN-AI: ALERT → MAP CONNECTION
  onViewOnMap?: (alert: Alert) => void;
}) {
  const severity = severityOf(alert.confidence);
  const tone = TONE[severity];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className={cn(
        "glass relative overflow-hidden rounded-2xl border-l-4 p-3",
        tone.ring,
        severity === "critical" && "animate-pulse-ring",
      )}
    >
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-secondary/50">
          {alert.image ? (
            <img
              src={alert.image}
              alt={alert.message || "Alert snapshot"}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageOff className="size-5" />
            </div>
          )}
          <span className={cn("absolute inset-x-0 bottom-0 h-0.5", tone.bar)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm font-semibold">{alert.message || "Alert detected"}</p>
            <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold", tone.chip)}>
              {formatConfidence(alert.confidence)}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Camera className="size-3" /> {alert.cameraId || "—"}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" /> {formatCoord(alert.latitude)}, {formatCoord(alert.longitude)}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="rounded-full border border-border/70 bg-secondary/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
              {alert.status || "pending"}
            </span>
            <span className="text-[11px] text-muted-foreground">{formatTime(alert.timestamp)}</span>
          </div>

          {/* GUARDIAN-AI: ALERT → MAP CONNECTION — only for alerts with real coordinates. */}
          {onViewOnMap && isValidCoord(alert.latitude, alert.longitude) ? (
            <button
              type="button"
              onClick={() => onViewOnMap(alert)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
            >
              <MapIcon className="size-3" /> View on Map
            </button>
          ) : null}
        </div>
      </div>
    </motion.article>
  );
}
