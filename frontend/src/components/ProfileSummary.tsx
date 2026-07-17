"use client";

import { Badge, Card, Flex, Text, Title } from "@tremor/react";

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
    <Card
      aria-label="Dataset profile"
      className="!bg-tremor-background/90 !ring-tremor-ring dark:!bg-dark-tremor-background/90 dark:!ring-dark-tremor-ring"
    >
      <Flex alignItems="start" className="gap-3">
        <div className="min-w-0 flex-1">
          <Title className="!font-display !text-foreground">
            {dataset.name}
          </Title>
          <Text className="mt-1 tabular-nums">
            {dataset.row_count.toLocaleString()} rows · {cols.length} fields
          </Text>
        </div>
        {dataset.source === "demo" && (
          <Badge color="teal" size="xs">
            Demo
          </Badge>
        )}
      </Flex>

      <div className="mt-5 flex flex-wrap gap-2">
        {cols.map((col) => (
          <Badge
            key={col.name}
            color="stone"
            size="sm"
            className="!font-normal"
          >
            {col.name}
            <span className="opacity-60"> · {formatType(col.type)}</span>
          </Badge>
        ))}
      </div>
    </Card>
  );
}
