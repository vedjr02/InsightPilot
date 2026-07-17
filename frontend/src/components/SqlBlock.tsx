"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId, useState } from "react";

type SqlBlockProps = {
  sql: string;
};

export function SqlBlock({ sql }: SqlBlockProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const reduce = useReducedMotion();

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="text-caption text-muted transition-colors hover:text-foreground"
      >
        {open ? "Hide SQL" : "Run this SQL yourself"}
      </button>
      <motion.div
        id={panelId}
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={reduce ? { duration: 0 } : { duration: 0.2 }}
        className="overflow-hidden"
      >
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-2 px-4 py-3 font-mono text-xs leading-relaxed text-foreground">
          {sql}
        </pre>
      </motion.div>
    </div>
  );
}
