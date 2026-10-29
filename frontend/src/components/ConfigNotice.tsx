import { AlertTriangle } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

export function ConfigNotice() {
  if (isFirebaseConfigured) return null;
  return (
    <div className="mt-5 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-left">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-warning">Firebase not connected.</span> Add your Firebase web
        config as <code className="font-mono">VITE_FIREBASE_*</code> environment variables to enable email
        authentication, Firestore alerts and storage.
      </p>
    </div>
  );
}
