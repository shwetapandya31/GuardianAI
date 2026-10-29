import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, BellRing, Cctv, ShieldAlert, Radio, Inbox } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { TopBar } from "@/components/TopBar";
import { StatCard } from "@/components/StatCard";
import { AlertCard } from "@/components/AlertCard";
import { CameraCard } from "@/components/CameraCard";
import { CameraForm, handleDeleteCamera } from "@/components/CameraForm";
import { EmptyState, PageTransition } from "@/components/ui-kit";
import { AlertSkeleton, CameraSkeleton, StatSkeleton } from "@/components/Skeletons";
import { AmbientBackground } from "@/components/AmbientBackground";
// GUARDIAN-AI: LIVE CAMERA MONITORING (all camera UI/logic lives in LiveCamera.tsx)
import { LiveCamera } from "@/components/LiveCamera";
// GUARDIAN-AI: REAL INCIDENT MAP
import { IncidentMap } from "@/components/IncidentMap";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useAlertCount, useAlerts, useCameras } from "@/hooks/useFirestore";
import { severityOf, type Camera } from "@/lib/types";
import { cn } from "@/lib/utils";
import { isCameraActive } from "@/lib/cameraUtils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Live Console — GuardianAI Surveillance" },
      {
        name: "description",
        content:
          "Monitor real-time fall detection alerts, camera health and confidence scores across your CCTV network.",
      },
      { property: "og:title", content: "Live Console — GuardianAI Surveillance" },
      {
        property: "og:description",
        content: "Real-time fall detection alerts and camera health monitoring.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);
  // GUARDIAN-AI: ALERT → MAP CONNECTION
  const [focusAlertId, setFocusAlertId] = useState<string | null>(null);
  const [isManaging, setIsManaging] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);

  const alerts = useAlerts(50, refreshKey);
  const cameras = useCameras(refreshKey);
  const alertCount = useAlertCount(refreshKey);

  const stats = useMemo(() => {
    const highConfidence = alerts.data.filter((a) => a.confidence > 0.9).length;
    const active = cameras.data.filter((c) => isCameraActive(c)).length;
    const online = active > 0;
    return { highConfidence, active, online };
  }, [alerts.data, cameras.data]);

  const live = alerts.data.slice(0, 6);

  return (
    <PageTransition>
      <AmbientBackground variant="dashboard" />
      <TopBar unread={stats.highConfidence} />
      <PullToRefresh
        onRefresh={async () => {
          setRefreshKey((k) => k + 1);
          await new Promise((r) => setTimeout(r, 500));
        }}
      >
        <main className="mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-5">
          <section>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {alerts.loading || cameras.loading ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    icon={BellRing}
                    label="Total Alerts"
                    value={alertCount.loading ? alerts.data.length : alertCount.count}
                    index={0}
                  />
                  <StatCard
                    icon={Cctv}
                    label="Active Cameras"
                    value={`${stats.active}/${cameras.data.length}`}
                    tone="cyan"
                    index={1}
                  />
                  <StatCard
                    icon={ShieldAlert}
                    label="High Confidence"
                    value={stats.highConfidence}
                    tone="critical"
                    hint=">90% certainty"
                    index={2}
                  />
                  <StatCard
                    icon={Activity}
                    label="System Status"
                    value={stats.online ? "Online" : "Offline"}
                    tone={stats.online ? "success" : "critical"}
                    index={3}
                  />
                </>
              )}
            </div>
          </section>

          {/* GUARDIAN-AI: LIVE CAMERA MONITORING */}
          <LiveCamera cameras={cameras.data} />

          {/* GUARDIAN-AI: REAL INCIDENT MAP */}
          <IncidentMap alerts={alerts.data} cameras={cameras.data} focusAlertId={focusAlertId} />

          <section>
            <SectionHeader
              title="Live AI Alert Feed"
              caption="Streaming from detection pipeline"
              live
            />
            <div className="glass mt-3 overflow-hidden rounded-2xl">
              {alerts.loading ? (
                <div className="space-y-2 p-3">
                  <AlertSkeleton />
                  <AlertSkeleton />
                </div>
              ) : live.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  Feed idle — no detections streaming right now.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {live.map((alert) => {
                      const severity = severityOf(alert.confidence);
                      return (
                        <motion.li
                          key={alert.id}
                          layout
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <span
                            className={`size-2 shrink-0 rounded-full ${
                              severity === "critical"
                                ? "animate-pulse bg-critical"
                                : severity === "warning"
                                  ? "bg-warning"
                                  : "bg-primary"
                            }`}
                          />
                          <p className="min-w-0 flex-1 truncate text-sm">{alert.message}</p>
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {alert.cameraId}
                          </span>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </section>

          <section>
            <SectionHeader title="Recent Alerts" caption="Ordered by newest detection" />
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {alerts.loading ? (
                <>
                  <AlertSkeleton />
                  <AlertSkeleton />
                  <AlertSkeleton />
                  <AlertSkeleton />
                </>
              ) : alerts.data.length === 0 ? (
                <div className="md:col-span-2">
                  <EmptyState
                    icon={<Inbox className="size-8" />}
                    title="No alerts yet"
                    description={
                      alerts.error ?? "Detections from your AI backend will appear here in real time."
                    }
                  />
                </div>
              ) : (
                alerts.data.map((alert, i) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    index={i}
                    // GUARDIAN-AI: ALERT → MAP CONNECTION
                    onViewOnMap={(a) => {
                      setFocusAlertId(a.id);
                      document
                        .getElementById("incident-map")
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                ))
              )}
            </div>
          </section>

          <section id="dashboard-cameras">
            <div className="flex items-end justify-between gap-3">
              <SectionHeader title="Cameras" caption="Network coverage and health" />
              <button
                type="button"
                onClick={() => {
                  const nextState = !isManaging;
                  setIsManaging(nextState);
                  if (!nextState) setEditingCamera(null);
                }}
                className={cn(
                  "shrink-0 rounded-xl border border-border/70 px-3 py-1.5 text-xs font-semibold transition-colors",
                  isManaging
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary/40 text-muted-foreground hover:text-foreground",
                )}
              >
                {isManaging ? "Done" : "Manage"}
              </button>
            </div>

            {isManaging && (
              <div className="mb-4 mt-4">
                <CameraForm
                  editingCamera={editingCamera}
                  onSaveSuccess={() => setEditingCamera(null)}
                  onCancel={() => setEditingCamera(null)}
                />
              </div>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cameras.loading ? (
                <>
                  <CameraSkeleton />
                  <CameraSkeleton />
                  <CameraSkeleton />
                </>
              ) : cameras.data.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3">
                  <EmptyState
                    icon={<Cctv className="size-8" />}
                    title="No cameras registered"
                    description={cameras.error ?? "Add cameras to your Firestore `cameras` collection."}
                  />
                </div>
              ) : (
                cameras.data.map((camera, i) => (
                  <CameraCard
                    key={camera.id}
                    camera={camera}
                    index={i}
                    onEdit={
                      isManaging
                        ? () => {
                            setEditingCamera(camera);
                            document
                              .getElementById("dashboard-cameras")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }
                        : undefined
                    }
                    onDelete={isManaging ? () => handleDeleteCamera(camera) : undefined}
                  />
                ))
              )}
            </div>
          </section>
        </main>
      </PullToRefresh>
    </PageTransition>
  );
}

function SectionHeader({
  title,
  caption,
  live = false,
}: {
  title: string;
  caption?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </div>
      {live ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-critical/40 bg-critical/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-critical">
          <Radio className="size-3 animate-pulse" /> Live
        </span>
      ) : null}
    </div>
  );
}
