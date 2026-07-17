"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { DatasetPicker } from "@/components/DatasetPicker";
import { ErrorBubble } from "@/components/ErrorBubble";
import { ExampleQuestionChip } from "@/components/ExampleQuestionChip";
import { ProfileSummary } from "@/components/ProfileSummary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThinkingIndicator } from "@/components/ThinkingIndicator";
import { askStream } from "@/lib/ask";
import {
  type Dataset,
  fetchDemoDataset,
  uploadCsv,
} from "@/lib/api";
import type { ChatMessage } from "@/lib/types";

const EXAMPLE_QUESTIONS = [
  "What are the top 5 categories by revenue?",
  "Why did Electronics revenue dip in March?",
  "Which segment has the highest return rate?",
  "Show monthly revenue trend for 2024",
];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Home() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadDemo = useCallback(async () => {
    const ds = await fetchDemoDataset();
    setDataset(ds);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ds = await fetchDemoDataset();
        if (!cancelled) setDataset(ds);
      } catch (err) {
        if (!cancelled) {
          setBootError(
            err instanceof Error
              ? err.message
              : "Could not reach the API. Is the backend running?"
          );
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function handleUpload(file: File) {
    const ds = await uploadCsv(file);
    setDataset(ds);
    setMessages([]);
  }

  async function sendQuestion(question: string) {
    if (!dataset || busy) return;
    const q = question.trim();
    if (!q) return;

    setBusy(true);
    setDraft("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: q }]);
    setThinking("Profiling data…");

    await askStream(q, dataset.id, {
      onStatus: (message) => setThinking(message),
      onResult: (result) => {
        setThinking(null);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: result.insight,
            result,
            error: !result.ok,
          },
        ]);
      },
      onError: (message) => {
        setThinking(null);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content:
              message ||
              "I couldn’t answer that — try rephrasing your question.",
            error: true,
          },
        ]);
      },
    });

    setBusy(false);
    setThinking(null);
  }

  const showEmpty = dataset && messages.length === 0 && !thinking;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="mx-auto flex max-w-chat items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              InsightPilot
            </p>
            {dataset && (
              <p className="truncate text-caption text-muted">{dataset.name}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-4">
            <ThemeToggle />
            <DatasetPicker
              hasDataset={Boolean(dataset)}
              onSelectDemo={async () => {
                await loadDemo();
                setMessages([]);
              }}
              onUploaded={handleUpload}
              busy={booting || busy}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-chat flex-1 flex-col px-4 pb-4 pt-10 sm:px-6">
        {booting && (
          <p className="text-caption text-muted">Loading dataset…</p>
        )}

        {!booting && bootError && !dataset && (
          <div className="space-y-2">
            <p className="text-chat-body text-danger">{bootError}</p>
            <p className="text-caption text-muted">
              The API may be waking up — wait a moment, or upload a CSV.
            </p>
          </div>
        )}

        {showEmpty && (
          <div className="flex flex-1 flex-col justify-center gap-10 pb-8">
            <div className="space-y-3">
              <h1 className="font-display text-display text-foreground">
                InsightPilot
              </h1>
              <p className="max-w-[36ch] text-chat-body text-muted">
                Ask a business question. I’ll query the data, show my work, and
                answer in plain English.
              </p>
            </div>

            <ProfileSummary dataset={dataset} />

            <div>
              <p className="mb-1 text-caption uppercase tracking-wider text-muted">
                Try asking
              </p>
              <div className="divide-y divide-border">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <ExampleQuestionChip
                    key={q}
                    question={q}
                    disabled={busy}
                    onSelect={(question) => void sendQuestion(question)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-8">
          {messages.map((m) =>
            m.role === "user" ? (
              <ChatBubble key={m.id} role="user" content={m.content} />
            ) : m.error && !m.result ? (
              <ErrorBubble key={m.id} message={m.content} />
            ) : (
              <ChatBubble
                key={m.id}
                role="assistant"
                content={m.content}
                result={m.result}
                error={m.error}
              />
            )
          )}
          {thinking && <ThinkingIndicator status={thinking} />}
          <div ref={bottomRef} />
        </div>
      </main>

      {dataset && (
        <div className="sticky bottom-0 bg-gradient-to-t from-background via-background to-transparent pt-4">
          <ChatInput
            onSend={(q) => void sendQuestion(q)}
            disabled={busy || !dataset}
            initialValue={draft}
          />
        </div>
      )}
    </div>
  );
}
