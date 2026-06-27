import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useThemeStore } from "@/lib/theme-store";

/**
 * Applies the active theme class to <html>.
 * - Home route ("/") is always dark to preserve the hero design.
 * - Every other route follows the user's persisted preference.
 */
export function ThemeManager() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const effective = pathname === "/" ? "dark" : theme;
    root.classList.remove("light", "dark");
    root.classList.add(effective);
    root.style.colorScheme = effective;
  }, [pathname, theme]);

  return null;
}

import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
  variant?: "icon" | "row";
}

export function ThemeToggle({ className = "", variant = "icon" }: ThemeToggleProps) {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl glass hover:glass-strong font-semibold ${className}`}
      >
        <span className="flex items-center gap-2">
          {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
          Theme
        </span>
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {isDark ? "Dark" : "Light"}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0 ${className}`}
    >
      {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
    </button>
  );
}
