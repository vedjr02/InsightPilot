"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/components/StatCard";
import type { ChartConfig } from "@/lib/types";

type ChartCardProps = {
  chart: ChartConfig;
  rows: Record<string, unknown>[];
  columns: string[];
};

const ACCENT = "var(--accent)";
const MUTED = "var(--muted)";
const BORDER = "var(--border)";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: unknown }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md">
      {label != null && <p className="mb-1 text-muted">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-foreground">
          {p.name}: {String(p.value)}
        </p>
      ))}
    </div>
  );
}

export function ChartCard({ chart, rows, columns }: ChartCardProps) {
  if (chart.chart_type === "empty") {
    return (
      <p className="mt-4 text-sm text-muted">
        {(chart.config.message as string) ||
          "That query returned no rows — try widening the date range or check the exact category name."}
      </p>
    );
  }

  if (chart.chart_type === "stat") {
    return (
      <StatCard
        label={String(chart.config.label ?? columns[0] ?? "Result")}
        value={chart.config.value}
        extras={chart.config.extras as Record<string, unknown> | undefined}
      />
    );
  }

  if (chart.chart_type === "table") {
    return (
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-left text-caption">
          <thead className="text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c} className="py-2 pr-4 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-t border-border">
                {columns.map((c) => (
                  <td key={c} className="py-2 pr-4 tabular-nums text-foreground">
                    {String(row[c] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const data = rows.map((r) => ({ ...r }));

  if (chart.chart_type === "line") {
    const x = String(chart.config.x);
    const y = String(chart.config.y);
    return (
      <div className="mt-2 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey={x}
              tick={{ fill: MUTED, fontSize: 12 }}
              axisLine={{ stroke: BORDER }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: MUTED, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey={y}
              stroke={ACCENT}
              strokeWidth={2}
              dot={false}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.chart_type === "bar") {
    const x = String(chart.config.x);
    const y = String(chart.config.y);
    const horizontal = chart.config.orientation === "horizontal";
    return (
      <div className="mt-2 h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={horizontal ? "vertical" : "horizontal"}
            margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
          >
            <CartesianGrid stroke={BORDER} strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} />
            {horizontal ? (
              <>
                <XAxis type="number" tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey={y}
                  width={100}
                  tick={{ fill: MUTED, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
              </>
            ) : (
              <>
                <XAxis dataKey={y} tick={{ fill: MUTED, fontSize: 12 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                <YAxis tick={{ fill: MUTED, fontSize: 12 }} axisLine={false} tickLine={false} width={56} />
              </>
            )}
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey={x} fill={ACCENT} radius={[4, 4, 4, 4]} isAnimationActive />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (chart.chart_type === "pie") {
    const labelKey = String(chart.config.label);
    const valueKey = String(chart.config.value);
    const colors = ["#0f766e", "#2dd4bf", "#134e4a", "#5eead4", "#115e59"];
    return (
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
              isAnimationActive
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
