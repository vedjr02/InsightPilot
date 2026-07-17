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
    const initial =
      stored === "light" || stored === "dark" ? stored : getSystemTheme();
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

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="text-caption text-muted transition-colors hover:text-foreground disabled:opacity-40"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
