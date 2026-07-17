"use client";

type StatCardProps = {
  label: string;
  value: unknown;
  extras?: Record<string, unknown>;
};

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? v.toLocaleString()
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function StatCard({ label, value, extras }: StatCardProps) {
  return (
    <div className="mt-4 rounded-lg border border-border bg-surface-2 px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-medium tracking-tight tabular-nums text-foreground">
        {formatValue(value)}
      </p>
      {extras && Object.keys(extras).length > 0 && (
        <dl className="mt-3 grid gap-1 text-sm">
          {Object.entries(extras).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted">{k}</dt>
              <dd className="tabular-nums text-foreground">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
