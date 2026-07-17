"use client";

import { useReducedMotion, motion } from "framer-motion";
import { useId, useState } from "react";

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
  self_correct: "Self-corrected",
};

export function ReasoningTrace({
  steps,
  defaultOpen = false,
}: ReasoningTraceProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const reduce = useReducedMotion();

  if (!steps.length) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm text-muted transition-colors hover:text-foreground"
      >
        <span>How I got this answer</span>
        <span className="text-xs tabular-nums">{open ? "Hide" : "Show"}</span>
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
        <ol className="mt-2 space-y-2 border-l border-border pl-4">
          {steps.map((step, i) => (
            <li key={`${step.tool}-${i}`} className="text-sm">
              <p
                className={
                  step.tool === "self_correct"
                    ? "font-medium text-accent"
                    : "font-medium text-foreground"
                }
              >
                {TOOL_LABELS[step.tool] ?? step.tool}
                {step.ok === false ? " — needed a fix" : ""}
              </p>
              <p className="mt-0.5 text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </motion.div>
    </div>
  );
}
