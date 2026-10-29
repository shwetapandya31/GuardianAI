import { motion } from "framer-motion";

type Variant = "login" | "register" | "dashboard" | "profile";

/** Fixed node layout (literal values keep SSR and client markup identical). */
const NODES = [
  { x: 71.13, y: 14.21, d: 12.2, r: 2.72 },
  { x: 55.67, y: 38.6, d: 10.96, r: 2.26 },
  { x: 46.02, y: 36.16, d: 17.03, r: 1.45 },
  { x: 29.97, y: 87.03, d: 14.18, r: 1.57 },
  { x: 78.46, y: 53.18, d: 17.06, r: 1.83 },
  { x: 72.25, y: 55.78, d: 14.88, r: 2.96 },
  { x: 50.33, y: 55.59, d: 9.21, r: 2.08 },
  { x: 52.06, y: 56.28, d: 16.45, r: 1.41 },
  { x: 51.92, y: 55.73, d: 8.59, r: 2.2 },
  { x: 7.75, y: 39.73, d: 10.86, r: 2.32 },
  { x: 58.13, y: 84.94, d: 15.41, r: 2.58 },
  { x: 59.78, y: 76.22, d: 14.32, r: 2.41 },
  { x: 41.32, y: 24.59, d: 9.33, r: 1.43 },
  { x: 80.72, y: 70.82, d: 8.63, r: 2.07 },
];

const EDGES: [number, number][] = [
  [0, 3],
  [1, 4],
  [2, 6],
  [3, 7],
  [4, 8],
  [5, 9],
  [6, 10],
  [7, 11],
  [8, 12],
  [9, 13],
  [10, 2],
  [11, 5],
];

/**
 * Ambient, low-motion background art for the safety platform.
 * Purely decorative — never intercepts pointer events.
 */
export function AmbientBackground({ variant = "login" }: { variant?: Variant }) {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base glow wash */}
      <div className="absolute inset-0 opacity-90 [background:var(--gradient-shell)]" />

      {/* User control room background image layer - Dashboard ONLY */}
      {variant === "dashboard" ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 dark:opacity-50 transition-opacity duration-700"
          style={{ backgroundImage: "url('/background.png')" }}
        />
      ) : null}

      {variant !== "dashboard" ? (
        <motion.div
          className="absolute -left-32 top-[-10%] size-[36rem] rounded-full bg-primary/12 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : null}
      <motion.div
        className="absolute -right-40 bottom-[-15%] size-[34rem] rounded-full bg-accent/10 blur-3xl"
        animate={{ x: [0, -30, 0], y: [0, -24, 0] }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      {variant === "login" ? (
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {EDGES.map(([a, b], i) => {
            const from = NODES[a]!;
            const to = NODES[b]!;
            return (
              <motion.line
                key={i}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="var(--cyan)"
                strokeWidth={0.12}
                initial={{ opacity: 0.08 }}
                animate={{ opacity: [0.08, 0.26, 0.08] }}
                transition={{ duration: 9 + i, repeat: Infinity, ease: "easeInOut" }}
              />
            );
          })}
          {NODES.map((n, i) => (
            <motion.circle
              key={i}
              cx={n.x}
              cy={n.y}
              r={n.r * 0.35}
              fill="var(--primary)"
              animate={{ opacity: [0.25, 0.7, 0.25], scale: [1, 1.25, 1] }}
              transition={{ duration: n.d + 8, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </svg>
      ) : null}



      {variant === "register" ? (
        <>
          {/* Concentric radar rings — slow, calm expansion */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 top-1/2 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20"
                animate={{ scale: [0.6, 1.6], opacity: [0.35, 0] }}
                transition={{ duration: 12, delay: i * 4, repeat: Infinity, ease: "easeOut" }}
              />
            ))}
          </div>
          <div className="grid-noise absolute inset-0 opacity-[0.35] [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" />
          <motion.div
            className="absolute inset-x-0 h-24 bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--cyan)_12%,transparent),transparent)]"
            animate={{ top: ["-10%", "100%"] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />
        </>
      ) : null}

      {variant === "dashboard" ? (
        <>
          <div className="grid-noise absolute inset-0 opacity-[0.5] [mask-image:radial-gradient(80%_60%_at_50%_0%,black,transparent)]" />
          <motion.div
            className="absolute left-[12%] top-[18%] size-[26rem] rounded-full bg-primary/8 blur-[90px]"
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-[8%] top-[45%] size-[20rem] rounded-full bg-accent/8 blur-[90px]"
            animate={{ opacity: [0.5, 0.25, 0.5] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </>
      ) : null}
    </div>
  );
}
