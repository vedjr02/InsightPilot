export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type ColumnProfile = {
  name: string;
  original_name: string;
  type: string;
  null_count: number;
  distinct_count: number;
  min?: number | string;
  max?: number | string;
  top_values?: { value: string; count: number }[];
};

export type DatasetProfile = {
  row_count: number;
  column_count: number;
  columns: ColumnProfile[];
  sample_rows: Record<string, unknown>[];
};

export type Dataset = {
  id: string;
  name: string;
  source: "demo" | "upload";
  table_name: string;
  row_count: number;
  original_filename: string | null;
  created_at: string | null;
  profile: DatasetProfile;
};

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json() as Promise<T>;
}

export async function fetchDemoDataset(): Promise<Dataset> {
  const res = await fetch(`${API_URL}/datasets/demo`, { cache: "no-store" });
  return parseJson<Dataset>(res);
}

export async function fetchDatasets(): Promise<Dataset[]> {
  const res = await fetch(`${API_URL}/datasets`, { cache: "no-store" });
  const data = await parseJson<{ datasets: Dataset[] }>(res);
  return data.datasets;
}

export async function uploadCsv(file: File): Promise<Dataset> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/datasets/upload`, {
    method: "POST",
    body: form,
  });
  return parseJson<Dataset>(res);
}
