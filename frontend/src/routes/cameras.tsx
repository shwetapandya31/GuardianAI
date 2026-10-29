import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Cctv } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { TopBar } from "@/components/TopBar";
import { CameraCard } from "@/components/CameraCard";
import { CameraSkeleton } from "@/components/Skeletons";
import { EmptyState, PageTransition } from "@/components/ui-kit";
import { CameraForm, handleDeleteCamera } from "@/components/CameraForm";
import { useCameras } from "@/hooks/useFirestore";
import type { Camera } from "@/lib/types";
import { isCameraActive } from "@/lib/cameraUtils";

export const Route = createFileRoute("/cameras")({
  head: () => ({
    meta: [
      { title: "Camera Network — GuardianAI" },
      {
        name: "description",
        content:
          "Register and monitor CCTV cameras: stream URLs, locations, live status badges and last-seen times.",
      },
      { property: "og:title", content: "Camera Network — GuardianAI" },
      {
        property: "og:description",
        content: "Register and monitor CCTV cameras across your GuardianAI network.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CamerasPage />
    </RequireAuth>
  ),
});

function CamerasPage() {
  const cameras = useCameras();
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);

  const activeCount = useMemo(
    () => cameras.data.filter((c) => isCameraActive(c)).length,
    [cameras.data],
  );

  return (
    <PageTransition>
      <TopBar />
      <main className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-5">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Console
          </Link>
          <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">
            {activeCount}/{cameras.data.length} active
          </span>
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold">Camera Network</h1>
          <p className="text-xs text-muted-foreground">Register and monitor CCTV endpoints</p>
        </div>

        <CameraForm
          editingCamera={editingCamera}
          onSaveSuccess={() => setEditingCamera(null)}
          onCancel={() => setEditingCamera(null)}
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                description={cameras.error ?? "Add your first camera using the form above."}
              />
            </div>
          ) : (
            cameras.data.map((camera, i) => (
              <CameraCard
                key={camera.id}
                camera={camera}
                index={i}
                onEdit={() => {
                  setEditingCamera(camera);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDelete={() => handleDeleteCamera(camera)}
              />
            ))
          )}
        </div>
      </main>
    </PageTransition>
  );
}
