import { useState, useEffect, useCallback } from "react";

const THEME_KEY = "moodmemos-theme";

export const useTheme = () => {
  const [theme, setThemeState] = useState<string>(
    () => localStorage.getItem(THEME_KEY) || "modern"
  );

  const isClassic = theme === "classic";

  // Listen for changes from other components (e.g. SettingsSheet)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_KEY) {
        setThemeState(e.newValue || "modern");
      }
    };

    // Also poll for same-tab changes (localStorage events only fire cross-tab)
    const interval = setInterval(() => {
      const current = localStorage.getItem(THEME_KEY) || "modern";
      setThemeState((prev) => (prev !== current ? current : prev));
    }, 300);

    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(interval);
    };
  }, []);

  const setTheme = useCallback((newTheme: string) => {
    localStorage.setItem(THEME_KEY, newTheme);
    document.documentElement.classList.remove("theme-classic");
    if (newTheme === "classic") {
      document.documentElement.classList.add("theme-classic");
    }
    setThemeState(newTheme);
  }, []);

  return { theme, isClassic, setTheme };
};
