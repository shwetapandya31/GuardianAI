import { Link } from "@tanstack/react-router";
import { Moon, Sun } from "lucide-react";
import { BrandMark } from "@/components/Logo";
// GUARDIAN-AI: REAL-TIME FIRESTORE NOTIFICATIONS — bell + panel live in this component.
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";

export function TopBar({ unread = 0 }: { unread?: number }) {
  const { profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const initials = (profile?.name || "G")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="glass-panel sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <BrandMark subtitle="AI Safety & Alert Platform" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid size-10 place-items-center rounded-xl border border-border/70 bg-secondary/40 text-muted-foreground transition-colors hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <NotificationBell />
          <Link to="/profile" aria-label="Open profile">
            <Avatar className="size-10 border border-border/70 ring-2 ring-primary/30">
              <AvatarImage src={profile?.profileImage || undefined} alt={profile?.name || "Profile"} />
              <AvatarFallback className="bg-secondary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
}
