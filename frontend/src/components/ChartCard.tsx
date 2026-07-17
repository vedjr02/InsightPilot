"use client";

import {
  BarChart,
  Card,
  DonutChart,
  LineChart,
  Metric,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from "@tremor/react";

import type { ChartConfig } from "@/lib/types";

type ChartCardProps = {
  chart: ChartConfig;
  rows: Record<string, unknown>[];
  columns: string[];
};

function toNumber(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return 0;
}

function formatValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "number") {
    return Number.isInteger(v)
      ? v.toLocaleString()
      : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** Normalize agent result rows into Tremor-friendly records. */
function tremorRows(
  rows: Record<string, unknown>[],
  indexKey: string,
  valueKeys: string[]
): Record<string, string | number>[] {
  return rows.map((row) => {
    const out: Record<string, string | number> = {
      [indexKey]: String(row[indexKey] ?? ""),
    };
    for (const key of valueKeys) {
      out[key] = toNumber(row[key]);
    }
    return out;
  });
}

export function ChartCard({ chart, rows, columns }: ChartCardProps) {
  if (chart.chart_type === "empty") {
    return (
      <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Text>
          {(chart.config.message as string) ||
            "That query returned no rows — try widening the date range or check the exact category name."}
        </Text>
      </Card>
    );
  }

  if (chart.chart_type === "stat") {
    const label = String(chart.config.label ?? columns[0] ?? "Result");
    const extras = chart.config.extras as Record<string, unknown> | undefined;
    return (
      <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Text>{label}</Text>
        <Metric className="mt-1 tabular-nums font-display">
          {formatValue(chart.config.value)}
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

  if (chart.chart_type === "table") {
    return (
      <Card className="mt-3 overflow-x-auto !bg-tremor-background !p-0 !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableHeaderCell key={c}>{c}</TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, 50).map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c} className="tabular-nums">
                    {formatValue(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  if (chart.chart_type === "line") {
    const x = String(chart.config.x);
    const y = String(chart.config.y);
    const data = tremorRows(rows, x, [y]);
    return (
      <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Title className="!font-display">{y}</Title>
        <Text>Over {x}</Text>
        <LineChart
          className="mt-4 h-60"
          data={data}
          index={x}
          categories={[y]}
          colors={["teal"]}
          valueFormatter={formatTick}
          showLegend={false}
          showAnimation
          curveType="monotone"
          yAxisWidth={48}
        />
      </Card>
    );
  }

  if (chart.chart_type === "bar") {
    const valueKey = String(chart.config.x);
    const labelKey = String(chart.config.y);
    const data = tremorRows(rows, labelKey, [valueKey]);
    const layout =
      chart.config.orientation === "horizontal" ? "vertical" : "horizontal";
    return (
      <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Title className="!font-display">{valueKey}</Title>
        <Text>By {labelKey}</Text>
        <BarChart
          className="mt-4 h-60"
          data={data}
          index={labelKey}
          categories={[valueKey]}
          colors={["teal"]}
          valueFormatter={formatTick}
          showLegend={false}
          showAnimation
          layout={layout}
          yAxisWidth={layout === "vertical" ? 100 : 48}
        />
      </Card>
    );
  }

  if (chart.chart_type === "pie") {
    const labelKey = String(chart.config.label);
    const valueKey = String(chart.config.value);
    const data = tremorRows(rows, labelKey, [valueKey]);
    return (
      <Card className="mt-3 !bg-tremor-background !ring-tremor-ring dark:!bg-dark-tremor-background dark:!ring-dark-tremor-ring">
        <Title className="!font-display">{valueKey}</Title>
        <Text>Share by {labelKey}</Text>
        <DonutChart
          className="mx-auto mt-4 h-52"
          data={data}
          index={labelKey}
          category={valueKey}
          colors={["teal", "emerald", "cyan", "lime", "green"]}
          valueFormatter={formatTick}
          showAnimation
          showLabel
        />
      </Card>
    );
  }

  return null;
}
