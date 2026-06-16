import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package, Heart, MapPin, Settings, TrendingUp, Sparkles } from "lucide-react";
import { products } from "@/lib/products";
import { formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Account — Neural" }] }),
  component: Dashboard,
});

const orders = [
  { id: "NRL-2840", date: "Mar 14", status: "Delivered", total: 2499, product: products[0] },
  { id: "NRL-2710", date: "Feb 22", status: "In transit", total: 820, product: products[3] },
  { id: "NRL-2655", date: "Feb 02", status: "Delivered", total: 390, product: products[4] },
];

function Dashboard() {
  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden"
      >
        <div className="absolute -inset-1 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="size-16 sm:size-20 rounded-2xl bg-aurora animate-aurora shadow-glow-cyan grid place-items-center font-extrabold text-2xl text-background shrink-0">
            AK
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">
              Prime Member · Tier 03
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">
              Welcome back, Aria
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              3 active orders · 84 loyalty credits
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Orders", value: "12", icon: Package, accent: "text-cyan" },
          { label: "Wishlist", value: "7", icon: Heart, accent: "text-purple" },
          { label: "Spent", value: "$8.4K", icon: TrendingUp, accent: "text-rose" },
          { label: "Credits", value: "84", icon: Sparkles, accent: "text-cyan" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass rounded-2xl p-5"
          >
            <s.icon className={`size-5 ${s.accent} mb-3`} />
            <p className="text-2xl font-extrabold font-mono">{s.value}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
              {s.label}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders */}
        <div className="lg:col-span-2 glass-strong rounded-3xl p-6">
          <h2 className="text-xl font-bold mb-5">Recent orders</h2>
          <div className="space-y-3">
            {orders.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="relative pl-6"
              >
                <span
                  className={`absolute left-0 top-4 size-3 rounded-full ${
                    o.status === "Delivered" ? "bg-cyan" : "bg-amber-400 animate-pulse"
                  }`}
                />
                {i < orders.length - 1 && (
                  <span className="absolute left-[5px] top-7 bottom-0 w-px bg-white/10" />
                )}
                <div className="glass rounded-2xl p-4 flex items-center gap-4 ml-2">
                  <div className="size-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                    <img
                      src={o.product.image}
                      alt={o.product.name}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{o.product.name}</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {o.id} · {o.date}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono font-bold text-cyan">{formatPrice(o.total)}</p>
                    <p className="text-xs text-muted-foreground">{o.status}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side */}
        <div className="space-y-6">
          <div className="glass-strong rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Wishlist</h2>
              <Link to="/shop" className="text-xs text-cyan">View all</Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {products.slice(2, 6).map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.07 }}
                  className="glass rounded-xl overflow-hidden"
                >
                  <div className="aspect-square bg-secondary">
                    <img src={p.image} alt={p.name} className="size-full object-cover" />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {formatPrice(p.price)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="glass-strong rounded-3xl p-6 space-y-2">
            <h2 className="text-lg font-bold mb-3">Quick actions</h2>
            {[
              { icon: MapPin, label: "Saved addresses" },
              { icon: Settings, label: "Preferences" },
            ].map((a) => (
              <button
                key={a.label}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass hover:glass-strong transition-all text-left"
              >
                <a.icon className="size-4 text-cyan" />
                <span className="text-sm font-medium">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
