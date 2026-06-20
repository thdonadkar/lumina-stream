import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Cart — Neural" },
      { name: "description", content: "Review the items in your cart and proceed to checkout." },
      { property: "og:title", content: "Your Cart — Neural" },
      { property: "og:description", content: "Review the items in your cart and proceed to checkout." },
    ],
    links: [{ rel: "canonical", href: "/cart" }],
  }),
  component: CartPage,
});

function CartPage() {
  // Avoid SSR/client hydration mismatch — items live in localStorage.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  if (!hydrated) {
    return <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto" aria-busy="true" />;
  }

  if (items.length === 0) {
    return (
      <div className="px-4 pt-28 pb-24 max-w-2xl mx-auto text-center">
        <div className="glass-strong rounded-3xl p-10 sm:p-14">
          <div className="size-16 rounded-2xl bg-aurora animate-aurora grid place-items-center text-background mx-auto mb-5">
            <ShoppingBag className="size-7" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Your cart is empty</h1>
          <p className="text-sm text-muted-foreground mt-2">Looks like you haven't added anything yet.</p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-aurora animate-aurora font-bold text-background shadow-glow-cyan"
          >
            Continue shopping <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-6">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <ul className="space-y-3">
          {items.map((i) => (
            <motion.li
              key={i.product.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-strong rounded-2xl p-3 sm:p-4 flex items-center gap-4"
            >
              <Link to="/product/$id" params={{ id: i.product.id }} className="size-20 rounded-xl overflow-hidden bg-secondary shrink-0">
                <img referrerPolicy="no-referrer" src={i.product.image} alt={i.product.name} className="size-full object-cover" loading="lazy" />
              </Link>
              <div className="flex-1 min-w-0">
                <Link to="/product/$id" params={{ id: i.product.id }} className="font-bold truncate block hover:text-cyan">
                  {i.product.name}
                </Link>
                <p className="text-xs text-muted-foreground line-clamp-1">{i.product.tagline}</p>
                <p className="text-sm font-mono text-cyan mt-1">{formatPrice(i.product.price)}</p>
              </div>
              <div className="flex items-center gap-1 glass rounded-full px-2 py-1">
                <button
                  onClick={() => setQty(i.product.id, i.qty - 1)}
                  aria-label={`Decrease quantity of ${i.product.name}`}
                  className="size-7 grid place-items-center rounded-full hover:bg-white/5"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="min-w-[24px] text-center text-sm font-mono tabular-nums">{i.qty}</span>
                <button
                  onClick={() => setQty(i.product.id, i.qty + 1)}
                  aria-label={`Increase quantity of ${i.product.name}`}
                  className="size-7 grid place-items-center rounded-full hover:bg-white/5"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <button
                onClick={() => remove(i.product.id)}
                aria-label={`Remove ${i.product.name} from cart`}
                className="size-9 grid place-items-center rounded-full glass hover:glass-strong text-muted-foreground hover:text-rose-400"
              >
                <Trash2 className="size-4" />
              </button>
            </motion.li>
          ))}
        </ul>

        <aside className="glass-strong rounded-3xl p-6 h-fit lg:sticky lg:top-24">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">Summary</p>
          <div className="flex items-center justify-between mb-2 text-sm">
            <span>Subtotal</span>
            <span className="font-mono">{formatPrice(total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Shipping and taxes calculated at checkout.</p>
          <Link
            to="/checkout"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-aurora animate-aurora font-bold text-background shadow-glow-cyan"
          >
            Checkout <ArrowRight className="size-4" />
          </Link>
          <Link to="/shop" className="mt-3 block text-center text-xs text-muted-foreground hover:text-foreground">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
