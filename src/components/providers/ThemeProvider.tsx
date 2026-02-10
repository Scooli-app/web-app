"use client";

import type { AppDispatch, RootState } from "@/store/store";
import { setTheme, type ThemeMode } from "@/store/ui/uiSlice";
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

const THEME_STORAGE_KEY = "scooli-theme";

function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  return null;
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const theme = useSelector((state: RootState) => state.ui.theme);

  const resolveAndApplyTheme = useCallback((themeMode: ThemeMode) => {
    const effectiveTheme = themeMode === "system" ? getSystemTheme() : themeMode;
    applyTheme(effectiveTheme);
  }, []);

  // On mount, load theme from localStorage and sync to Redux
  useEffect(() => {
    const storedTheme = getStoredTheme();
    if (storedTheme) {
      dispatch(setTheme(storedTheme));
      resolveAndApplyTheme(storedTheme);
    } else {
      // Default to dark theme
      dispatch(setTheme("dark"));
      resolveAndApplyTheme("dark");
    }
  }, [dispatch, resolveAndApplyTheme]);

  // Sync theme changes to DOM and localStorage
  useEffect(() => {
    resolveAndApplyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme, resolveAndApplyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user has "system" preference
      if (theme === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [theme]);

  return children;
}
