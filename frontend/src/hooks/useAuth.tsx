import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { COLLECTIONS, getDb, getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase";
import type { UserProfile } from "@/lib/types";

type AuthState = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  configured: false,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !user) {
      setProfile(null);
      return;
    }
    return onSnapshot(doc(getDb(), COLLECTIONS.users, user.uid), (snap) => {
      setProfile(snap.exists() ? ({ uid: user.uid, ...snap.data() } as UserProfile) : null);
    });
  }, [user]);

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading,
      configured: isFirebaseConfigured,
      logout: async () => {
        if (isFirebaseConfigured) await signOut(getFirebaseAuth());
      },
    }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
