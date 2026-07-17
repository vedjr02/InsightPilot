"use client";

import { motion, useReducedMotion } from "framer-motion";

import { ChartCard } from "@/components/ChartCard";
import { ReasoningTrace } from "@/components/ReasoningTrace";
import { SqlBlock } from "@/components/SqlBlock";
import type { AgentResult } from "@/lib/types";

type ChatBubbleProps = {
  role: "user" | "assistant";
  content: string;
  result?: AgentResult;
  error?: boolean;
};

export function ChatBubble({ role, content, result, error }: ChatBubbleProps) {
  const reduce = useReducedMotion();
  const isUser = role === "user";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground"
            : error
              ? "w-full max-w-chat rounded-lg border border-danger/30 bg-surface px-4 py-3 text-sm"
              : "w-full max-w-chat rounded-lg border border-border bg-surface px-4 py-3 text-sm shadow-sm"
        }
      >
        <p
          className={
            isUser
              ? "leading-relaxed"
              : error
                ? "max-w-[65ch] leading-relaxed text-danger"
                : "max-w-[65ch] text-chat-body leading-relaxed text-foreground"
          }
        >
          {content}
        </p>

        {result && !error && (
          <>
            {result.rows?.length > 0 && (
              <ChartCard
                chart={result.chart}
                rows={result.rows}
                columns={result.columns}
              />
            )}
            {result.empty_result && (
              <ChartCard
                chart={result.chart}
                rows={[]}
                columns={result.columns}
              />
            )}
            <ReasoningTrace steps={result.trace ?? []} />
            {result.sql && <SqlBlock sql={result.sql} />}
          </>
        )}
      </div>
    </motion.div>
  );
}
