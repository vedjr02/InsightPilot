"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type ThinkingIndicatorProps = {
  status: string;
};

export function ThinkingIndicator({ status }: ThinkingIndicatorProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className="flex items-baseline gap-3 py-2"
      role="status"
      aria-live="polite"
    >
      <span className="relative mt-1.5 flex h-1.5 w-1.5 shrink-0">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-accent"
            animate={{ opacity: [0.35, 1, 0.35], scale: [1, 1.35, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      <AnimatePresence mode="wait">
        <motion.p
          key={status}
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="font-display text-title text-foreground"
        >
          {status}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
