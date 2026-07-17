import { API_URL, type Dataset } from "@/lib/api";
import type { AgentResult } from "@/lib/types";

export async function askStream(
  question: string,
  datasetId: string,
  handlers: {
    onStatus: (message: string) => void;
    onResult: (result: AgentResult) => void;
    onError: (message: string) => void;
  }
): Promise<void> {
  const res = await fetch(`${API_URL}/ask/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, dataset_id: datasetId }),
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    handlers.onError(typeof detail === "string" ? detail : "Request failed");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Parse SSE blocks separated by blank lines
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      let event = "message";
      let data = "";
      for (const line of lines) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "status" && typeof parsed.message === "string") {
          handlers.onStatus(parsed.message);
        } else if (event === "result") {
          handlers.onResult(parsed as unknown as AgentResult);
        }
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}

export type { Dataset };
