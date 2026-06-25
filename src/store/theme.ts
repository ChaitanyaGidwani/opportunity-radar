"use client";

import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";

const KEY = "or-theme";

function apply(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Theme {
  if (typeof document === "undefined") return "light";
  return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

/**
 * Theme hook backed by an external store (the document attribute + localStorage),
 * which is the React-correct way to read client-only state without a
 * setState-in-effect or a hydration flash. The no-flash default is set by an
 * inline script in the root layout.
 */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = (t: Theme) => {
    try {
      localStorage.setItem(KEY, t);
    } catch {}
    apply(t);
    listeners.forEach((l) => l());
  };

  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}
