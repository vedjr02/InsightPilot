"use client";

import { motion, useReducedMotion } from "framer-motion";

type BootLoaderProps = {
  label?: string;
};

export function BootLoader({ label = "Loading dataset…" }: BootLoaderProps) {
  const reduce = useReducedMotion();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="font-display text-title text-foreground">{label}</p>
        <p className="text-caption text-muted">
          Waking the analyst and pulling your demo data
        </p>

        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
          role="progressbar"
          aria-label={label}
          aria-busy="true"
        >
          {reduce ? (
            <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-accent" />
          ) : (
            <motion.div
              className="absolute inset-y-0 w-1/3 rounded-full bg-accent"
              initial={{ left: "-33%" }}
              animate={{ left: ["-33%", "100%"] }}
              transition={{
                duration: 1.35,
                ease: [0.4, 0, 0.2, 1],
                repeat: Infinity,
              }}
            />
          )}
        </div>

        {!reduce && (
          <div className="flex justify-center gap-1.5 pt-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1 w-1 rounded-full bg-accent"
                animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1.15, 0.85] }}
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  delay: i * 0.18,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
