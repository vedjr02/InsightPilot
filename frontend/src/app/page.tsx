"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { BootLoader } from "@/components/BootLoader";
import { ChatBubble } from "@/components/ChatBubble";
import { ChatInput } from "@/components/ChatInput";
import { DatasetPicker } from "@/components/DatasetPicker";
import { ErrorBubble } from "@/components/ErrorBubble";
import { ExampleQuestionChip } from "@/components/ExampleQuestionChip";
import { ProfileSummary } from "@/components/ProfileSummary";
import { RibbonsBackdrop } from "@/components/RibbonsBackdrop";
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
  const inConversation = messages.length > 0 || Boolean(thinking);

  return (
    <div className="relative flex min-h-screen flex-col">
      <RibbonsBackdrop active={!inConversation || booting} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/85">
          <div className="mx-auto flex w-full max-w-shell items-center justify-between gap-4 px-6 py-4 lg:px-10">
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

        <main className="mx-auto flex w-full max-w-shell flex-1 flex-col px-6 pb-6 pt-8 lg:px-10 lg:pt-12">
          {booting && <BootLoader />}

          {!booting && bootError && !dataset && (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <p className="max-w-md text-chat-body text-danger">{bootError}</p>
              <p className="mt-2 max-w-md text-caption text-muted">
                The API may be waking up — wait a moment, or upload a CSV.
              </p>
            </div>
          )}

          {showEmpty && (
            <div className="mx-auto grid w-full max-w-shell flex-1 grid-cols-1 content-center gap-12 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-12">
              <div className="space-y-8">
                <div className="space-y-4">
                  <h1 className="font-display text-display text-foreground">
                    InsightPilot
                  </h1>
                  <p className="max-w-[42ch] text-chat-body text-muted">
                    Ask a business question. I’ll query the data, show my work,
                    and answer in plain English.
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-caption uppercase tracking-wider text-muted">
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

              <div className="lg:pt-2">
                <ProfileSummary dataset={dataset} />
              </div>
            </div>
          )}

          {inConversation && (
            <div className="mx-auto flex w-full max-w-chat flex-col gap-8 py-2">
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
          )}
        </main>

        {dataset && (
          <div className="sticky bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent pt-4">
            <div className="mx-auto w-full max-w-shell">
              <ChatInput
                onSend={(q) => void sendQuestion(q)}
                disabled={busy || !dataset}
                initialValue={draft}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
