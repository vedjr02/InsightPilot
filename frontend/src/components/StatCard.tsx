"use client";

import { Card, Metric, Text } from "@tremor/react";

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
    <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
      <Text>{label}</Text>
      <Metric className="mt-1 tabular-nums font-display">
        {formatValue(value)}
      </Metric>
      {extras && Object.keys(extras).length > 0 && (
        <div className="mt-4 grid max-w-sm gap-2">
          {Object.entries(extras).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6">
              <Text>{k}</Text>
              <Text className="!text-tremor-content-strong dark:!text-dark-tremor-content-strong tabular-nums">
                {formatValue(v)}
              </Text>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
