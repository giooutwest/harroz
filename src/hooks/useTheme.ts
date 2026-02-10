import { useThemeContext } from "@/contexts/ThemeContext";

/**
 * Backward-compatible wrapper around the new ThemeContext.
 * `isClassic` now maps to `isStudio` for existing component checks.
 */
export const useTheme = () => {
  const ctx = useThemeContext();

  return {
    theme: ctx.isZine ? "modern" : "classic",
    isClassic: ctx.isStudio,
    isZine: ctx.isZine,
    isStudio: ctx.isStudio,
    isDark: ctx.isDark,
    setTheme: (newTheme: string) => {
      if (newTheme === "modern") {
        ctx.setPersona("zine");
      } else {
        ctx.setPersona("studio");
      }
    },
  };
};
