import { motion } from "framer-motion";
import { Cctv, Clock, MapPin, Video, Pencil, Trash } from "lucide-react";
import { formatTime } from "@/lib/format";
import { isValidCoord } from "@/lib/geo";
import type { Camera } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isCameraActive } from "@/lib/cameraUtils";

export function CameraCard({
  camera,
  index = 0,
  onEdit,
  onDelete,
}: {
  camera: Camera;
  index?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const active = isCameraActive(camera);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      whileHover={{ y: -3 }}
      className="glass rounded-2xl p-4 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-xl border border-border/70 bg-secondary/50 text-cyan">
              <Cctv className="size-4.5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold">{camera.name || camera.cameraId}</p>
              <p className="min-w-0 break-words text-xs text-muted-foreground">
                {camera.location || "Unknown location"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
              active
                ? "border-success/40 bg-success/15 text-success"
                : "border-border/70 bg-secondary/50 text-muted-foreground",
            )}
          >
            <span className={cn("size-1.5 rounded-full", active ? "bg-success" : "bg-muted-foreground")} />
            {active ? "Active" : "Offline"}
          </span>
        </div>

        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          {/* GUARDIAN-AI: CAMERA INSTALLATION LOCATION — the place name is what the
              operator reads; the stored coordinates stay behind the scenes. */}
          <p className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {isValidCoord(camera.latitude, camera.longitude)
              ? "Location saved for routing"
              : "No installation location saved"}
          </p>
          {camera.streamUrl ? (
            <p className="flex items-center gap-1">
              <Video className="size-3 shrink-0" />
              <a
                href={camera.streamUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-primary hover:underline"
              >
                {camera.streamUrl}
              </a>
            </p>
          ) : null}
          <p className="inline-flex items-center gap-1">
            <Clock className="size-3" /> Last seen {formatTime(camera.lastSeen ?? null)}
          </p>
        </div>
      </div>

      {(onEdit || onDelete) && (
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/40 pt-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/40 px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary/70 hover:text-primary/80 transition-colors"
              aria-label="Edit camera"
            >
              <Pencil className="size-3.5" /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              aria-label="Delete camera"
            >
              <Trash className="size-3.5" /> Delete
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
