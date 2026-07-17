"use client";

import { motion, useReducedMotion } from "framer-motion";

type ThinkingIndicatorProps = {
  status: string;
};

export function ThinkingIndicator({ status }: ThinkingIndicatorProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {!reduce && (
          <motion.span
            className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60"
            animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
      </span>
      <span className="text-foreground">{status}</span>
    </div>
  );
}
