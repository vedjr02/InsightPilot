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
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={isUser ? "flex justify-end" : "block"}
    >
      {isUser ? (
        <p className="max-w-[min(85%,28rem)] rounded-md bg-surface-2 px-4 py-3 text-sm leading-relaxed text-foreground">
          {content}
        </p>
      ) : (
        <div className="space-y-5">
          <p
            className={
              error
                ? "max-w-[68ch] text-chat-body text-danger"
                : "max-w-[68ch] text-chat-body text-foreground"
            }
          >
            {content}
          </p>

          {result && !error && (
            <div className="space-y-1">
              {(result.rows?.length > 0 || result.empty_result) && (
                <ChartCard
                  chart={result.chart}
                  rows={result.rows ?? []}
                  columns={result.columns}
                />
              )}
              <ReasoningTrace steps={result.trace ?? []} />
              {result.sql && <SqlBlock sql={result.sql} />}
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}
