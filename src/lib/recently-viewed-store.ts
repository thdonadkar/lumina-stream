import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "@/lib/products";

const MAX = 12;

type State = {
  items: Product[];
  push: (p: Product) => void;
  clear: () => void;
};

// Lightweight client-only "recently viewed" store. Persisted in localStorage so
// it survives reloads but never leaves the browser. We dedupe by id and keep
// the most-recently-viewed item at index 0.
export const useRecentlyViewed = create<State>()(
  persist(
    (set) => ({
      items: [],
      push: (p) =>
        set((s) => {
          if (!p?.id) return s;
          const next = [p, ...s.items.filter((x) => x.id !== p.id)].slice(0, MAX);
          return { items: next };
        }),
      clear: () => set({ items: [] }),
    }),
    { name: "atomspot-recently-viewed" },
  ),
);
