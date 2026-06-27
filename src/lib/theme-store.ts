import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type ThemePreference = "light" | "dark";

interface ThemeState {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (t) => set({ theme: t }),
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
    }),
    {
      name: "atomspot-theme",
      storage: createJSONStorage(() => (typeof window !== "undefined" ? localStorage : (undefined as any))),
    },
  ),
);
