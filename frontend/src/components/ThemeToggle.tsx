"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("ip-theme") as Theme | null;
    const initial = stored === "light" || stored === "dark" ? stored : getSystemTheme();
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
    setReady(true);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("ip-theme", next);
  }

  if (!ready) {
    return (
      <button
        type="button"
        aria-label="Toggle color theme"
        className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted"
        disabled
      >
        Theme
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-surface-2"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
