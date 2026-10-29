// GUARDIAN-AI: REAL-TIME FIRESTORE NOTIFICATIONS
// Bell + dropdown panel backed only by real documents from the shared Firestore
// `alerts` collection. No sample notifications are ever generated, and the browser
// Notification permission API is deliberately NOT requested — the in-app bell works
// without it (browser push stays a separate future feature).
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Camera as CameraIcon, CheckCheck, ImageOff, MapPin, X } from "lucide-react";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { formatConfidence, formatCoord, formatTime } from "@/lib/format";
import { severityOf } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONE = {
  critical: "border-critical/50 text-critical",
  warning: "border-warning/50 text-warning",
  info: "border-primary/40 text-primary",
} as const;

export function NotificationBell() {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications(30);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<Notification | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Keep the detail view in sync with live data (e.g. status changes on the alert).
  const liveDetail = detail ? (notifications.find((n) => n.id === detail.id) ?? detail) : null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid size-10 place-items-center rounded-xl border border-border/70 bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-1 -top-1 min-w-5 rounded-full bg-critical px-1 text-[10px] font-bold leading-5 text-primary-foreground"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="glass-panel absolute right-0 top-12 z-50 w-[min(92vw,22rem)] overflow-hidden rounded-2xl shadow-xl"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-3">
              <div>
                <p className="font-display text-sm font-bold">Alert Notifications</p>
                <p className="text-[11px] text-muted-foreground">
                  {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
                </p>
              </div>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="size-3.5" /> Mark all read
                </button>
              ) : null}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {loading ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading alerts…</p>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {error ?? "No new notifications"}
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {notifications.map((n) => (
                    <NotificationRow
                      key={n.id}
                      item={n}
                      onOpen={() => {
                        markRead(n.id);
                        setDetail(n);
                        setOpen(false);
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {liveDetail ? <AlertDetail item={liveDetail} onClose={() => setDetail(null)} /> : null}
    </div>
  );
}

function NotificationRow({ item, onOpen }: { item: Notification; onOpen: () => void }) {
  const severity = severityOf(item.confidence);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/40",
          !item.read && "bg-primary/5",
        )}
      >
        {/* GUARDIAN-AI: FIREBASE EVIDENCE IMAGE — real image_url thumbnail, never generated. */}
        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-secondary/50">
          {item.image ? (
            <img
              src={item.image}
              alt={item.message || "Evidence snapshot"}
              loading="lazy"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <ImageOff className="size-4" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            {!item.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
            <p className={cn("line-clamp-2 min-w-0 flex-1 text-sm", item.read ? "font-medium" : "font-semibold")}>
              {item.message || "Alert detected"}
            </p>
            <span
              className={cn(
                "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-bold",
                TONE[severity],
              )}
            >
              {formatConfidence(item.confidence)}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CameraIcon className="size-3" /> {item.cameraId || "—"}
            </span>
            {typeof item.latitude === "number" && typeof item.longitude === "number" ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3" /> {formatCoord(item.latitude)}, {formatCoord(item.longitude)}
              </span>
            ) : null}
            <span>{formatTime(item.timestamp)}</span>
          </div>
        </div>
      </button>
    </li>
  );
}

function AlertDetail({ item, onClose }: { item: Notification; onClose: () => void }) {
  const severity = severityOf(item.confidence);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass-panel max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Alert detail"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">{item.message || "Alert detected"}</h2>
            <p className="text-[11px] text-muted-foreground">{formatTime(item.timestamp)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close alert detail"
            className="grid size-8 shrink-0 place-items-center rounded-lg border border-border/70 bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* GUARDIAN-AI: FIREBASE EVIDENCE IMAGE
            Detection → evidence image → Firebase Storage → alerts.image_url → here.
            Nothing is fabricated when the field is missing. */}
        <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-secondary/40">
          {item.image ? (
            <img
              src={item.image}
              alt={`Evidence snapshot for ${item.message || "alert"}`}
              className="max-h-64 w-full object-contain"
            />
          ) : (
            <div className="grid h-32 place-items-center gap-2 text-xs text-muted-foreground">
              <ImageOff className="size-6" />
              Evidence image unavailable
            </div>
          )}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Field label="Camera ID" value={item.cameraId || "—"} />
          <Field label="Confidence" value={formatConfidence(item.confidence)} tone={TONE[severity]} />
          <Field
            label="Location"
            value={
              typeof item.latitude === "number" && typeof item.longitude === "number"
                ? `${formatCoord(item.latitude)}, ${formatCoord(item.longitude)}`
                : "—"
            }
          />
          <Field label="Incident status" value={item.status || "pending"} />
        </dl>
      </motion.div>
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/30 p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-sm font-semibold", tone)}>{value}</dd>
    </div>
  );
}
