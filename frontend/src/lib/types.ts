export type TraceStep = {
  tool: string;
  detail: string;
  sql?: string;
  ok?: boolean;
  attempt?: number;
  chart_type?: string;
  prior_error?: string;
  row_count?: number;
};

export type ChartConfig = {
  chart_type: "bar" | "line" | "pie" | "stat" | "table" | "empty";
  config: Record<string, unknown>;
  reason: string;
};

export type AgentResult = {
  ok: boolean;
  question: string;
  insight: string;
  empty_result?: boolean;
  chart: ChartConfig;
  sql: string | null;
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  trace: TraceStep[];
  attempts?: number;
  error?: string;
  dataset_id?: string;
};

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      content: string;
      result?: AgentResult;
      thinking?: string;
      error?: boolean;
    };
