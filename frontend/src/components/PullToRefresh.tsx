import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY <= 0 && e.touches[0]) startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing || !e.touches[0]) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0 && window.scrollY <= 0) setPull(Math.min(delta * 0.5, 100));
    };
    const onEnd = async () => {
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
      setPull(0);
      startY.current = null;
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [pull, refreshing, onRefresh]);

  return (
    <div>
      <motion.div
        animate={{ height: pull, opacity: pull > 8 ? 1 : 0 }}
        transition={{ duration: 0.12 }}
        className="flex items-end justify-center overflow-hidden"
      >
        <RefreshCw
          className={`mb-2 size-5 text-primary ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: `rotate(${pull * 3}deg)` }}
        />
      </motion.div>
      {children}
    </div>
  );
}
