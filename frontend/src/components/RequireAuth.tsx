import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { FullPageLoader } from "@/components/ui-kit";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const allowed = Boolean(user?.emailVerified);

  useEffect(() => {
    if (!loading && !allowed) navigate({ to: "/login", replace: true });
  }, [loading, allowed, navigate]);

  if (loading) return <FullPageLoader />;
  if (!allowed) return <FullPageLoader label="Redirecting to login…" />;
  return <>{children}</>;
}
