import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/ui-kit";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GuardianAI — AI Public Safety & Fall Detection" },
      {
        name: "description",
        content:
          "GuardianAI is an AI powered public safety console for real-time fall detection, CCTV monitoring and incident alerts.",
      },
      { property: "og:title", content: "GuardianAI — AI Public Safety & Fall Detection" },
      {
        property: "og:description",
        content: "Real-time fall detection and CCTV monitoring console for public safety teams.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    navigate({ to: user ? "/dashboard" : "/login", replace: true });
  }, [user, loading, navigate]);

  return <FullPageLoader label="Initialising GuardianAI…" />;
}
