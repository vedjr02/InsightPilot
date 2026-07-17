"use client";

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type SqlBlockProps = {
  sql: string;
};

export function SqlBlock({ sql }: SqlBlockProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduce = useReducedMotion();

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm text-muted transition-colors hover:text-foreground"
      >
        <span>Run this SQL yourself</span>
        <span className="text-xs">{open ? "Hide" : "Show"}</span>
      </button>
      <motion.div
        id={panelId}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.2 }}
        className="overflow-hidden"
      >
        <pre className="mt-2 overflow-x-auto rounded-md bg-surface-2 p-3 font-mono text-xs leading-relaxed text-foreground">
          {sql}
        </pre>
      </motion.div>
    </div>
  );
}
