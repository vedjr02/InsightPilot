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
      <header className="sticky top-0 z-10 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-chat items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-base font-medium tracking-tight text-foreground">
              InsightPilot
            </p>
            <p className="text-xs text-muted">
              {dataset ? dataset.name : "Autonomous business analyst"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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

      <main className="mx-auto flex w-full max-w-chat flex-1 flex-col px-4 py-6 sm:px-6">
        {booting && <p className="text-sm text-muted">Loading dataset…</p>}

        {!booting && bootError && !dataset && (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-danger">{bootError}</p>
            <p className="mt-2 text-sm text-muted">
              Start the API, or upload a CSV to continue.
            </p>
          </div>
        )}

        {showEmpty && (
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-sm text-muted">
                What’s in this data — ask anything about it.
              </p>
              <ProfileSummary dataset={dataset} />
            </div>
            <div>
              <p className="mb-3 text-sm text-muted">Try asking</p>
              <div className="flex flex-col gap-2">
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

        <div className="flex flex-col gap-4">
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
        <div className="sticky bottom-0">
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
