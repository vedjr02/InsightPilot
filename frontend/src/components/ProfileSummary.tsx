"use client";

import type { Dataset } from "@/lib/api";

type ProfileSummaryProps = {
  dataset: Dataset;
};

function formatType(t: string): string {
  const map: Record<string, string> = {
    TEXT: "text",
    BIGINT: "number",
    "DOUBLE PRECISION": "number",
    DATE: "date",
    BOOLEAN: "boolean",
  };
  return map[t] ?? t.toLowerCase();
}

export function ProfileSummary({ dataset }: ProfileSummaryProps) {
  const cols = dataset.profile?.columns ?? [];

  return (
    <section
      aria-label="Dataset profile"
      className="rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium tracking-tight text-foreground">
          {dataset.name}
        </h2>
        <p className="text-sm text-muted">
          {dataset.row_count.toLocaleString()} rows · {cols.length} columns
          {dataset.source === "demo" ? " · demo" : ""}
        </p>
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {cols.map((col) => (
          <li
            key={col.name}
            className="flex items-baseline justify-between gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm"
          >
            <span className="font-medium text-foreground">{col.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatType(col.type)}
              {col.null_count > 0 ? ` · ${col.null_count} null` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
