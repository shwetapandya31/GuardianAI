// GUARDIAN-AI: USER-SPECIFIC NOTIFICATION READ STATE
// The shared alert document's `status` field describes the INCIDENT and is shared by
// every operator at the station — it must never be used as a per-user read flag.
// Read state therefore lives client-side, keyed by the signed-in uid, so one officer
// marking an alert read never clears another officer's unread badge.
// Storage key: guardianai:read-alerts:{uid}
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAlerts } from "@/hooks/useFirestore";
import type { Alert } from "@/lib/types";

const PREFIX = "guardianai:read-alerts:";
const MAX_STORED = 500;

function storageKey(uid: string) {
  return `${PREFIX}${uid}`;
}

function loadRead(uid: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(uid));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export type Notification = Alert & { read: boolean };

export function useNotifications(max = 30) {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  // GUARDIAN-AI: REAL-TIME FIRESTORE NOTIFICATIONS
  // Reuses the existing realtime alerts subscription — no extra listener, no polling.
  const alerts = useAlerts(max);
  const [readIds, setReadIds] = useState<string[]>([]);

  // Read from localStorage after mount only (avoids any hydration mismatch).
  useEffect(() => {
    setReadIds(uid ? loadRead(uid) : []);
  }, [uid]);

  const persist = useCallback(
    (next: string[]) => {
      const trimmed = next.slice(-MAX_STORED);
      setReadIds(trimmed);
      if (uid && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(storageKey(uid), JSON.stringify(trimmed));
        } catch {
          /* storage full or blocked — badge simply stays unread */
        }
      }
    },
    [uid],
  );

  const readSet = useMemo(() => new Set(readIds), [readIds]);

  const notifications = useMemo<Notification[]>(
    () => alerts.data.map((a) => ({ ...a, read: readSet.has(a.id) })),
    [alerts.data, readSet],
  );

  const unreadCount = notifications.reduce((n, item) => n + (item.read ? 0 : 1), 0);

  const markRead = useCallback(
    (id: string) => {
      if (readSet.has(id)) return;
      persist([...readIds, id]);
    },
    [persist, readIds, readSet],
  );

  const markAllRead = useCallback(() => {
    const ids = new Set(readIds);
    notifications.forEach((n) => ids.add(n.id));
    persist([...ids]);
  }, [notifications, persist, readIds]);

  return {
    notifications,
    unreadCount,
    loading: alerts.loading,
    error: alerts.error,
    markRead,
    markAllRead,
  };
}
