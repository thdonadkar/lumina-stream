import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./products";

type WishlistState = {
  items: Product[];
  has: (id: string) => boolean;
  toggle: (p: Product) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: () => number;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      has: (id) => get().items.some((i) => i.id === id),
      toggle: (p) =>
        set((s) => ({
          items: s.items.some((i) => i.id === p.id)
            ? s.items.filter((i) => i.id !== p.id)
            : [...s.items, p],
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: "neural-wishlist" },
  ),
);
