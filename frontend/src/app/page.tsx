"use client";

import { useEffect, useState } from "react";

type ConnectionStatus = "checking" | "connected" | "disconnected";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      try {
        const response = await fetch(`${API_URL}/health`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Health check failed: ${response.status}`);
        }
        const data = (await response.json()) as { status?: string };
        if (!cancelled) {
          setStatus(data.status === "ok" ? "connected" : "disconnected");
        }
      } catch {
        if (!cancelled) {
          setStatus("disconnected");
        }
      }
    }

    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="text-center">
        <p className="text-sm tracking-wide text-foreground/50">InsightPilot</p>
        <h1 className="mt-3 text-2xl font-medium tracking-tight text-foreground">
          {status === "checking" && "Checking backend…"}
          {status === "connected" && "Connected"}
          {status === "disconnected" && "Backend unreachable"}
        </h1>
        <p className="mt-2 text-sm text-foreground/60">
          {status === "connected"
            ? `Health probe succeeded at ${API_URL}/health`
            : status === "disconnected"
              ? `Could not reach ${API_URL}/health`
              : `Probing ${API_URL}/health`}
        </p>
      </div>
    </main>
  );
}
