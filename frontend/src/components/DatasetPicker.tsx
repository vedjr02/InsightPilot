"use client";

import { useRef, useState } from "react";

type DatasetPickerProps = {
  onSelectDemo: () => Promise<void>;
  onUploaded: (file: File) => Promise<void>;
  busy?: boolean;
  hasDataset: boolean;
};

export function DatasetPicker({
  onSelectDemo,
  onUploaded,
  busy = false,
  hasDataset,
}: DatasetPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"demo" | "upload" | null>(null);

  async function handleDemo() {
    setError(null);
    setLoading("demo");
    try {
      await onSelectDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load demo");
    } finally {
      setLoading(null);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setLoading("upload");
    try {
      await onUploaded(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const disabled = busy || loading !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleDemo()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "demo"
            ? "Loading demo…"
            : hasDataset
              ? "Use demo dataset"
              : "Start with demo dataset"}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading === "upload" ? "Uploading…" : "Upload CSV"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
