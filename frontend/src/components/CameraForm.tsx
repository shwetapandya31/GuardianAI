import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Spinner } from "@/components/ui-kit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sharedCameraCollection } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { CameraLocationPicker } from "@/components/CameraLocationPicker";
import { isValidCoord, type LatLng } from "@/lib/geo";
import type { Camera } from "@/lib/types";

const EMPTY = { name: "", location: "", streamUrl: "", status: "active" };

export async function handleDeleteCamera(camera: Camera) {
  if (!window.confirm(`Delete camera ${camera.name || camera.cameraId}?`)) return;
  try {
    await deleteDoc(doc(sharedCameraCollection(), camera.id));
    toast.success("Camera deleted.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not delete camera.");
  }
}

export function CameraForm({
  editingCamera,
  onSaveSuccess,
  onCancel,
}: {
  editingCamera?: Camera | null;
  onSaveSuccess?: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [point, setPoint] = useState<LatLng | null>(null);

  useEffect(() => {
    if (editingCamera) {
      setForm({
        name: editingCamera.name || "",
        location: editingCamera.location || "",
        streamUrl: editingCamera.streamUrl || "",
        status: editingCamera.enabled ? "active" : "offline",
      });
      if (editingCamera.latitude != null && editingCamera.longitude != null) {
        setPoint({ lat: editingCamera.latitude, lng: editingCamera.longitude });
      } else {
        setPoint(null);
      }
    } else {
      setForm(EMPTY);
      setPoint(null);
    }
  }, [editingCamera]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Camera name is required.");
      return;
    }
    if (!user) {
      toast.error("You must be signed in to manage cameras.");
      return;
    }
    if (!point || !isValidCoord(point.lat, point.lng)) {
      toast.error("Select the camera's installation location on the map first.");
      return;
    }
    setSaving(true);
    try {
      if (editingCamera) {
        // Update existing camera
        await updateDoc(doc(sharedCameraCollection(), editingCamera.id), {
          name: form.name.trim(),
          location: form.location.trim(),
          streamUrl: form.streamUrl.trim(),
          latitude: point.lat,
          longitude: point.lng,
          status: form.status === "active" ? "unknown" : "offline",
          enabled: form.status === "active",
        });
        toast.success("Camera updated.");
      } else {
        // Add new camera
        await addDoc(sharedCameraCollection(), {
          cameraId: form.name.trim(),
          name: form.name.trim(),
          location: form.location.trim(),
          streamUrl: form.streamUrl.trim(),
          latitude: point.lat,
          longitude: point.lng,
          status: form.status === "active" ? "unknown" : "offline",
          enabled: form.status === "active",
          lastSeen: null,
          createdAt: serverTimestamp(),
        });
        toast.success("Camera registered.");
      }
      setForm(EMPTY);
      setPoint(null);
      onSaveSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editingCamera
            ? "Could not update camera."
            : "Could not add camera."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit}
      className="glass space-y-4 rounded-2xl p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-foreground">
          {editingCamera ? `Edit Camera (${editingCamera.name || editingCamera.cameraId})` : "Add New Camera"}
        </h3>
        {editingCamera && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" /> Cancel Edit
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="c-name">Camera Name</Label>
          <Input id="c-name" value={form.name} onChange={update("name")} placeholder="CAM-014" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-location">Location Name</Label>
          <Input
            id="c-location"
            value={form.location}
            onChange={update("location")}
            placeholder="Metro Station Gate 3"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-stream">Stream URL</Label>
          <Input
            id="c-stream"
            value={form.streamUrl}
            onChange={update("streamUrl")}
            placeholder="rtsp://..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="c-status">Status</Label>
          <select
            id="c-status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">Active</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {/* GUARDIAN-AI: CAMERA INSTALLATION LOCATION */}
      <div className="space-y-1.5">
        <Label>Installation Location</Label>
        <CameraLocationPicker
          value={point}
          locationName={form.location}
          onChange={(next, name) => {
            setPoint(next);
            if (name) setForm((f) => ({ ...f, location: name }));
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-4 py-2.5 font-display text-sm font-bold text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? <Spinner className="size-4" /> : <Plus className="size-4" />}
          {editingCamera ? "Update Camera" : "Add Camera"}
        </button>
        {editingCamera && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-border/70 bg-secondary/40 px-4 py-2.5 font-display text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        )}
      </div>
    </motion.form>
  );
}
