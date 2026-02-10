import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

export type ThemePersona = "studio" | "zine";
export type ColorMode = "light" | "dark" | "system";

interface ThemeContextValue {
  persona: ThemePersona;
  colorMode: ColorMode;
  resolvedColorMode: "light" | "dark";
  isStudio: boolean;
  isZine: boolean;
  isDark: boolean;
  navType: "bottom-bar" | "floating";
  setPersona: (p: ThemePersona) => void;
  setColorMode: (m: ColorMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const PERSONA_KEY = "roz-persona";
const COLOR_MODE_KEY = "roz-color-mode";
const OLD_THEME_KEY = "moodmemos-theme";
const MIGRATED_KEY = "roz-theme-migrated";

function getSystemPreference(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveColorMode(colorMode: ColorMode): "light" | "dark" {
  return colorMode === "system" ? getSystemPreference() : colorMode;
}

function applyThemeClasses(persona: ThemePersona, resolved: "light" | "dark") {
  const el = document.documentElement;
  el.classList.remove("theme-zine", "studio-dark");
  if (persona === "zine") {
    el.classList.add("theme-zine");
  } else if (resolved === "dark") {
    el.classList.add("studio-dark");
  }
}

function runMigration(): { persona: ThemePersona; colorMode: ColorMode } {
  const migrated = localStorage.getItem(MIGRATED_KEY);
  if (migrated === "true") {
    const persona = (localStorage.getItem(PERSONA_KEY) as ThemePersona) || "studio";
    const colorMode = (localStorage.getItem(COLOR_MODE_KEY) as ColorMode) || "system";
    return { persona, colorMode };
  }

  const oldTheme = localStorage.getItem(OLD_THEME_KEY);
  let persona: ThemePersona = "studio";
  let colorMode: ColorMode = "system";

  if (oldTheme === "classic") {
    persona = "studio";
    colorMode = "light";
  } else if (oldTheme === "modern") {
    persona = "studio";
    colorMode = "system";
  }

  localStorage.setItem(PERSONA_KEY, persona);
  localStorage.setItem(COLOR_MODE_KEY, colorMode);
  localStorage.setItem(MIGRATED_KEY, "true");

  return { persona, colorMode };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<ThemePersona>(() => runMigration().persona);
  const [colorMode, setColorModeState] = useState<ColorMode>(() => runMigration().colorMode);
  const [systemPref, setSystemPref] = useState<"light" | "dark">(getSystemPreference);

  const resolvedColorMode = persona === "zine" ? "dark" : (colorMode === "system" ? systemPref : colorMode);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemPref(e.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Apply CSS classes whenever theme changes
  useEffect(() => {
    applyThemeClasses(persona, resolvedColorMode);
  }, [persona, resolvedColorMode]);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === PERSONA_KEY && e.newValue) {
        setPersonaState(e.newValue as ThemePersona);
      }
      if (e.key === COLOR_MODE_KEY && e.newValue) {
        setColorModeState(e.newValue as ColorMode);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setPersona = useCallback((p: ThemePersona) => {
    localStorage.setItem(PERSONA_KEY, p);
    // Keep old key in sync for backward compat during migration
    localStorage.setItem(OLD_THEME_KEY, p === "zine" ? "modern" : "classic");
    setPersonaState(p);
  }, []);

  const setColorMode = useCallback((m: ColorMode) => {
    localStorage.setItem(COLOR_MODE_KEY, m);
    setColorModeState(m);
  }, []);

  const value = useMemo<ThemeContextValue>(() => ({
    persona,
    colorMode,
    resolvedColorMode,
    isStudio: persona === "studio",
    isZine: persona === "zine",
    isDark: resolvedColorMode === "dark",
    navType: persona === "studio" ? "bottom-bar" : "floating",
    setPersona,
    setColorMode,
  }), [persona, colorMode, resolvedColorMode, setPersona, setColorMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
