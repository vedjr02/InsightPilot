"use client";

import { type FormEvent, useEffect, useState } from "react";

const PLACEHOLDERS = [
  "Why did revenue dip in March?",
  "Which segment churns the most?",
  "Show me the trend for signups…",
  "What are the top categories by volume?",
];

type ChatInputProps = {
  onSend: (question: string) => void;
  disabled?: boolean;
  initialValue?: string;
};

export function ChatInput({
  onSend,
  disabled = false,
  initialValue = "",
}: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const [phIndex, setPhIndex] = useState(0);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (value.trim()) return;
    const id = window.setInterval(() => {
      setPhIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [value]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-border bg-surface px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-chat items-end gap-2">
        <label className="sr-only" htmlFor="chat-input">
          Ask a question
        </label>
        <textarea
          id="chat-input"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={PLACEHOLDERS[phIndex]}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          className="min-h-[48px] flex-1 resize-none rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition-shadow focus:border-accent focus:shadow-md disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="h-12 shrink-0 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
