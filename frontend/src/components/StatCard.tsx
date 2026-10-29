import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "primary",
  index = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "primary" | "cyan" | "critical" | "success";
  index?: number;
}) {
  const toneClass = {
    primary: "text-primary",
    cyan: "text-cyan",
    critical: "text-critical",
    success: "text-success",
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -3 }}
      className="glass relative overflow-hidden rounded-2xl p-4"
    >
      <div className="grid-noise pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative">
        <div
          className={cn(
            "grid size-9 place-items-center rounded-xl border border-border/70 bg-secondary/50",
            toneClass,
          )}
        >
          <Icon className="size-4.5" />
        </div>
        <p className="mt-3 font-display text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint ? <p className={cn("mt-1 text-[11px] font-medium", toneClass)}>{hint}</p> : null}
      </div>
    </motion.div>
  );
}
