import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCart, formatPrice } from "@/lib/cart-store";
import { products } from "@/lib/products";

export function CartDrawer() {
  const { items, isOpen, closeCart, setQty, remove, total, add } = useCart();
  const subtotal = total();
  const suggestions = products
    .filter((p) => !items.some((i) => i.product.id === p.id))
    .slice(0, 2);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
            className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-md"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[440px] glass-strong border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Your Cart
                </p>
                <h2 className="text-xl font-bold">{items.length} items</h2>
              </div>
              <button
                onClick={closeCart}
                className="size-9 grid place-items-center rounded-full glass hover:glass-strong"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {items.length === 0 && (
                <div className="text-center py-16">
                  <div className="size-16 mx-auto rounded-full bg-aurora opacity-40 animate-pulse-glow mb-4" />
                  <p className="font-semibold">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add some hardware to begin
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {items.map((i) => (
                  <motion.div
                    key={i.product.id}
                    layout
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0 }}
                    className="glass rounded-2xl p-3 flex gap-3 items-center"
                  >
                    <div className="size-16 rounded-xl bg-secondary overflow-hidden shrink-0">
                      <img
                        src={i.product.image}
                        alt={i.product.name}
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{i.product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {i.product.category}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => setQty(i.product.id, i.qty - 1)}
                          className="size-6 grid place-items-center rounded-md glass hover:glass-strong"
                        >
                          <Minus className="size-3" />
                        </button>
                        <motion.span
                          key={i.qty}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className="text-sm font-mono w-6 text-center"
                        >
                          {i.qty}
                        </motion.span>
                        <button
                          onClick={() => setQty(i.product.id, i.qty + 1)}
                          className="size-6 grid place-items-center rounded-md glass hover:glass-strong"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <motion.p
                        key={i.qty * i.product.price}
                        initial={{ opacity: 0.5, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-mono font-bold text-cyan"
                      >
                        {formatPrice(i.product.price * i.qty)}
                      </motion.p>
                      <button
                        onClick={() => remove(i.product.id)}
                        className="mt-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {items.length > 0 && suggestions.length > 0 && (
                <div className="pt-4 mt-4 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="size-3.5 text-purple" />
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      AI suggested pairings
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => add(p)}
                        className="glass rounded-xl p-2 text-left hover:glass-strong transition-all"
                      >
                        <div className="aspect-square rounded-lg bg-secondary overflow-hidden mb-2">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(p.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-5 space-y-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span className="font-mono text-cyan">Free</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/5">
                <span>Total</span>
                <motion.span
                  key={subtotal}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-gradient"
                >
                  {formatPrice(subtotal)}
                </motion.span>
              </div>
              <Link
                to="/checkout"
                onClick={closeCart}
                className="block text-center w-full py-3.5 rounded-xl bg-aurora animate-aurora font-bold text-background shadow-glow-cyan hover:scale-[1.01] active:scale-[0.99] transition-transform"
              >
                Checkout
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
