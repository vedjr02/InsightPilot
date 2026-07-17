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
    <div className="relative">
      <div className="flex items-center gap-3 text-caption">
        <button
          type="button"
          disabled={disabled}
          onClick={() => void handleDemo()}
          className="text-muted transition-colors hover:text-foreground disabled:opacity-40"
        >
          {loading === "demo" ? "Loading…" : hasDataset ? "Demo data" : "Load demo"}
        </button>
        <span className="text-border-strong" aria-hidden>
          /
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="text-muted transition-colors hover:text-foreground disabled:opacity-40"
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
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
