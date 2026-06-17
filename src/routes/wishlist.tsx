import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-store";
import { useCart, formatPrice } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — Neural" },
      { name: "description", content: "Saved products you love." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const items = useWishlist((s) => s.items);
  const remove = useWishlist((s) => s.remove);
  const addToCart = useCart((s) => s.add);

  return (
    <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tighter flex items-center gap-3">
            <Heart className="size-7 fill-rose-400 text-rose-400" />
            Wishlist
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} saved {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="glass-strong rounded-3xl p-16 text-center relative overflow-hidden">
          <div className="absolute -inset-10 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
          <Heart className="size-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">Your wishlist is empty</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Tap the heart on any product to save it for later.
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-2.5 rounded-full bg-aurora animate-aurora text-background text-sm font-bold"
          >
            Start browsing
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {items.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40 }}
                className="glass rounded-2xl p-4 flex items-center gap-4"
              >
                <img
                  src={p.image}
                  alt={p.name}
                  className="size-20 rounded-xl object-cover shrink-0"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="font-bold tracking-tight hover:underline block truncate"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
                  <p className="text-sm font-semibold mt-1">{formatPrice(p.price)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      addToCart(p);
                      remove(p.id);
                      toast.success(`${p.name} moved to cart`);
                    }}
                    className="grid place-items-center size-10 rounded-full bg-aurora animate-aurora text-background"
                    aria-label="Move to cart"
                  >
                    <ShoppingBag className="size-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="grid place-items-center size-10 rounded-full glass hover:glass-strong"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4 text-rose-400" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
