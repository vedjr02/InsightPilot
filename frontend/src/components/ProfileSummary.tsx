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
    BOOLEAN: "bool",
  };
  return map[t] ?? t.toLowerCase();
}

export function ProfileSummary({ dataset }: ProfileSummaryProps) {
  const cols = dataset.profile?.columns ?? [];

  return (
    <section aria-label="Dataset profile" className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-display text-title text-foreground">
          {dataset.name}
        </h2>
        <p className="text-caption tabular-nums text-muted">
          {dataset.row_count.toLocaleString()} rows · {cols.length} fields
          {dataset.source === "demo" ? " · demo" : ""}
        </p>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-y border-border py-3">
        {cols.map((col) => (
          <li key={col.name} className="text-caption">
            <span className="text-foreground">{col.name}</span>
            <span className="text-muted"> · {formatType(col.type)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
