"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useState } from "react";

import type { TraceStep } from "@/lib/types";

type ReasoningTraceProps = {
  steps: TraceStep[];
  defaultOpen?: boolean;
};

const TOOL_LABELS: Record<string, string> = {
  profile_data: "Profiled the data",
  generate_sql: "Wrote a query",
  validate_sql: "Checked the query",
  execute_query: "Ran the query",
  choose_chart_type: "Chose a chart",
  write_insight: "Wrote the answer",
  self_correct: "Tried a different approach",
};

export function ReasoningTrace({
  steps,
  defaultOpen,
}: ReasoningTraceProps) {
  const panelId = useId();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  // Collapse by default on small screens
  useEffect(() => {
    if (typeof defaultOpen === "boolean") {
      setOpen(defaultOpen);
      return;
    }
    const mq = window.matchMedia("(min-width: 640px)");
    setOpen(mq.matches);
  }, [defaultOpen]);

  if (!steps.length) return null;

  const selfCorrected = steps.some((s) => s.tool === "self_correct");

  return (
    <div className="mt-6 border-t border-border pt-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-baseline justify-between gap-4 text-left"
      >
        <span className="text-caption text-muted transition-colors hover:text-foreground">
          How I got this answer
          {selfCorrected ? " · corrected itself" : ""}
        </span>
        <span className="text-caption tabular-nums text-muted">
          {open ? "Hide" : `${steps.length} steps`}
        </span>
      </button>

      <motion.div
        id={panelId}
        initial={false}
        animate={{
          height: open ? "auto" : 0,
          opacity: open ? 1 : 0,
        }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
        }
        className="overflow-hidden"
      >
        <ol className="relative mt-4 space-y-4 border-l border-border pl-5">
          {steps.map((step, i) => {
            const isCorrect = step.tool === "self_correct";
            return (
              <li key={`${step.tool}-${i}`} className="relative">
                <span
                  aria-hidden
                  className={`absolute -left-[1.4rem] top-1.5 h-2 w-2 rounded-full ${
                    isCorrect || step.ok === false
                      ? "bg-accent"
                      : "bg-border-strong"
                  }`}
                />
                <p
                  className={
                    isCorrect
                      ? "text-sm font-medium text-accent"
                      : "text-sm font-medium text-foreground"
                  }
                >
                  {TOOL_LABELS[step.tool] ?? step.tool}
                  {step.ok === false ? " — needed a fix" : ""}
                </p>
                <p className="mt-0.5 max-w-[60ch] text-caption text-muted">
                  {step.detail}
                </p>
              </li>
            );
          })}
        </ol>
      </motion.div>
    </div>
  );
}
