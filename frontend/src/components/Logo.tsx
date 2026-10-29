import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ size = 40, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <motion.div
      initial={animated ? { scale: 0.85, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="relative grid place-items-center rounded-2xl bg-gradient-brand shadow-glow"
      style={{ width: size, height: size }}
    >
      <ShieldCheck className="text-primary-foreground" style={{ width: size * 0.55, height: size * 0.55 }} />
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="animate-scan absolute inset-x-0 top-0 h-1/4 bg-white/25 blur-[2px]" />
      </span>
    </motion.div>
  );
}

export function BrandMark({ className, subtitle }: { className?: string; subtitle?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Logo size={36} />
      <div className="leading-tight">
        <p className="font-display text-lg font-bold text-gradient">GuardianAI</p>
        {subtitle ? <p className="text-[11px] text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
