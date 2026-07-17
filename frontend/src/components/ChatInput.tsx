"use client";

import { type FormEvent, useEffect, useState } from "react";

const PLACEHOLDERS = [
  "Why did revenue dip in March?",
  "Which segment returns the most?",
  "Show the monthly revenue trend…",
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
    }, 4500);
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
    <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 lg:px-10">
      <div className="mx-auto max-w-chat rounded-lg border border-border bg-surface/95 p-2 shadow-md transition-shadow focus-within:border-border-strong">
        <label className="sr-only" htmlFor="chat-input">
          Ask a question about your data
        </label>
        <textarea
          id="chat-input"
          rows={2}
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
          className="min-h-[3.25rem] w-full resize-none bg-transparent px-3 py-2.5 text-chat-body text-foreground placeholder:text-muted/80 focus:outline-none disabled:opacity-50"
        />
        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <p className="caption text-caption text-muted">Enter to ask</p>
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover active:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ask
          </button>
        </div>
      </div>
    </form>
  );
}
