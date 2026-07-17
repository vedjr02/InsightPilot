"use client";

import { useCallback, useEffect, useState } from "react";

import { DatasetPicker } from "@/components/DatasetPicker";
import { ExampleQuestionChip } from "@/components/ExampleQuestionChip";
import { ProfileSummary } from "@/components/ProfileSummary";
import {
  type Dataset,
  fetchDemoDataset,
  uploadCsv,
} from "@/lib/api";

const EXAMPLE_QUESTIONS = [
  "What are the top 5 categories by revenue?",
  "Why did Electronics revenue dip in March?",
  "Which segment has the highest return rate?",
  "Show monthly revenue trend for 2024",
];

export default function Home() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

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

  async function handleUpload(file: File) {
    const ds = await uploadCsv(file);
    setDataset(ds);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-chat items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-base font-medium tracking-tight text-foreground">
              InsightPilot
            </p>
            <p className="text-xs text-muted">Autonomous business analyst</p>
          </div>
          <DatasetPicker
            hasDataset={Boolean(dataset)}
            onSelectDemo={loadDemo}
            onUploaded={handleUpload}
            busy={booting}
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-chat flex-1 flex-col px-4 py-8 sm:px-6">
        {booting && (
          <p className="text-sm text-muted">Loading dataset…</p>
        )}

        {!booting && bootError && !dataset && (
          <div className="rounded-lg border border-border bg-surface p-5">
            <p className="text-sm text-danger">{bootError}</p>
            <p className="mt-2 text-sm text-muted">
              Start the API, or upload a CSV to continue.
            </p>
          </div>
        )}

        {dataset && (
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
                    onSelect={setDraftQuestion}
                  />
                ))}
              </div>
              {draftQuestion && (
                <p className="mt-4 text-sm text-muted">
                  Selected: “{draftQuestion}” — chat wiring comes in Phase 4.
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
