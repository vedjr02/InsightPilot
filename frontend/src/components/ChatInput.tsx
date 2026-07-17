"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

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

/** ReUI / shadcn-inspired prompt composer — minimal, elevated, one composed unit. */
export function ChatInput({
  onSend,
  disabled = false,
  initialValue = "",
}: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const [phIndex, setPhIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const q = value.trim();
    if (!q || disabled) return;
    onSend(q);
    setValue("");
  }

  const canSend = Boolean(value.trim()) && !disabled;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-chat px-4 pb-5 pt-2 sm:px-0"
    >
      <div
        className={`group relative rounded-2xl border bg-surface shadow-md transition-[border-color,box-shadow] duration-200 ${
          focused
            ? "border-accent/40 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_18%,transparent)]"
            : "border-border hover:border-border-strong"
        }`}
      >
        <label className="sr-only" htmlFor="chat-input">
          Ask a question about your data
        </label>
        <textarea
          ref={textareaRef}
          id="chat-input"
          rows={1}
          value={value}
          disabled={disabled}
          placeholder={PLACEHOLDERS[phIndex]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="max-h-40 min-h-[52px] w-full resize-none bg-transparent px-5 pb-3 pt-4 text-chat-body leading-relaxed text-foreground placeholder:text-muted/70 focus:outline-none disabled:opacity-50"
        />

        <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2.5">
          <p className="pl-2 text-caption text-muted">
            <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              ⏎
            </kbd>
            <span className="ml-2">to ask · Shift+Enter for line</span>
          </p>

          <button
            type="submit"
            disabled={!canSend}
            aria-label="Ask"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground transition-all duration-150 hover:bg-accent-hover hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:scale-100"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
