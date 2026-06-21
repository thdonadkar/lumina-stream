import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "./products";

export type CartItem = {
  product: Product;
  qty: number;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (product: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  total: () => number;
  count: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (product, qty = 1) =>
        set((s) => {
          const existing = s.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.product.id === product.id ? { ...i, qty: i.qty + qty } : i,
              ),
              isOpen: true,
            };
          }
          return { items: [...s.items, { product, qty }], isOpen: true };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((i) => i.product.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.product.id === id ? { ...i, qty } : i))
            .filter((i) => i.qty > 0),
        })),
      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      total: () => get().items.reduce((acc, i) => acc + i.product.price * i.qty, 0),
      count: () => get().items.reduce((acc, i) => acc + i.qty, 0),
    }),
    {
      name: "atomspot-cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
