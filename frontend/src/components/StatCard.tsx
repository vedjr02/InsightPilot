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
    <div className="mt-2 py-2">
      <p className="text-caption text-muted">{label}</p>
      <p className="mt-1 font-display text-display tabular-nums text-foreground">
        {formatValue(value)}
      </p>
      {extras && Object.keys(extras).length > 0 && (
        <dl className="mt-4 grid max-w-sm gap-1.5 text-caption">
          {Object.entries(extras).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6">
              <dt className="text-muted">{k}</dt>
              <dd className="tabular-nums text-foreground">{formatValue(v)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
