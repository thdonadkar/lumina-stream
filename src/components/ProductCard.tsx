import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Star, Plus, Heart, Tag } from "lucide-react";
import type { Product } from "@/lib/products";
import { useCart, formatPrice } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { toast } from "sonner";

const accentMap: Record<Product["accent"], string> = {
  cyan: "from-cyan/20 to-transparent",
  purple: "from-purple/25 to-transparent",
  rose: "from-rose/20 to-transparent",
};

export function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const add = useCart((s) => s.add);
  const wished = useWishlist((s) => s.has(product.id));
  const toggleWish = useWishlist((s) => s.toggle);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      className="group relative glass rounded-3xl p-4 hover:glass-strong transition-all overflow-hidden"
    >
      <div
        className={`absolute -inset-px rounded-3xl bg-gradient-to-br ${accentMap[product.accent]} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}
        aria-hidden="true"
      />

      {/* Link wraps the media + text content only (no nested interactive) */}
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="block relative rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        aria-label={`${product.name} — ${formatPrice(product.price)}`}
      >
        <div className="relative aspect-[4/5] rounded-2xl bg-secondary overflow-hidden mb-4">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {product.badge && (
            <span
              title="Seller Promotion"
              className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/90 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-rose-300/40 shadow-glow-cyan"
            >
              <Tag className="size-3" aria-hidden="true" /> {product.badge}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold truncate">{product.name}</h3>
            <p className="text-xs text-muted-foreground truncate">{product.tagline}</p>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="size-3 fill-cyan text-cyan" aria-hidden="true" />
              <span className="font-mono">{product.rating}</span>
              <span>· {product.reviews}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-mono font-bold text-foreground">{formatPrice(product.price)}</p>
            {product.originalPrice && (
              <p className="text-[10px] text-muted-foreground line-through font-mono">
                {formatPrice(product.originalPrice)}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Action buttons — siblings of the Link, not children */}
      <button
        type="button"
        onClick={() => {
          toggleWish(product);
          toast.success(wished ? "Removed from wishlist" : "Saved to wishlist");
        }}
        className="absolute top-7 right-7 size-9 grid place-items-center rounded-full bg-background/60 backdrop-blur-md ring-1 ring-white/10 hover:bg-background/80 transition-all z-10"
        aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        aria-pressed={wished}
      >
        <Heart
          className={`size-4 transition-colors ${wished ? "fill-rose-400 text-rose-400" : "text-foreground"}`}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={() => {
          add(product);
          toast.success(`${product.name} added`, { description: "View your cart to checkout" });
        }}
        className="absolute bottom-[7.5rem] right-7 size-10 grid place-items-center rounded-full bg-foreground text-background opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 [@media(hover:none)]:opacity-100 [@media(hover:none)]:translate-y-0 transition-all shadow-glow-cyan hover:scale-110 z-10"
        aria-label={`Add ${product.name} to cart`}
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
