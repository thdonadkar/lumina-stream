import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Package, MapPin, Sparkles, TrendingUp, Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Account — Neural" }] }),
  component: Dashboard,
});

type Order = Awaited<ReturnType<typeof listMyOrders>>[number];

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 bg-amber-300/10",
  packed: "text-purple bg-purple/10",
  shipped: "text-cyan bg-cyan/10",
  out_for_delivery: "text-cyan bg-cyan/10",
  delivered: "text-emerald-300 bg-emerald-300/10",
  cancelled: "text-rose-400 bg-rose-400/10",
  return_requested: "text-rose-300 bg-rose-300/10",
};

function Dashboard() {
  const { userId, email, loading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const fetchOrders = useServerFn(listMyOrders);

  useEffect(() => {
    if (!userId) return;
    fetchOrders()
      .then(setOrders)
      .finally(() => setLoadingOrders(false));
  }, [userId, fetchOrders]);

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!userId) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to view your account</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -inset-1 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="size-16 sm:size-20 rounded-2xl bg-aurora animate-aurora shadow-glow-cyan grid place-items-center font-extrabold text-2xl text-background shrink-0">
            {(email ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Member account</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{email}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Orders", value: String(orders.length), icon: Package, accent: "text-cyan" },
          { label: "Delivered", value: String(deliveredCount), icon: TrendingUp, accent: "text-emerald-300" },
          { label: "Total spent", value: formatPrice(totalSpent), icon: Sparkles, accent: "text-rose-400" },
          { label: "Addresses", value: "View", icon: MapPin, accent: "text-purple", link: "/checkout" },
        ].map((s, i) => {
          const Inner = (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="glass rounded-2xl p-5 h-full"
            >
              <s.icon className={`size-5 ${s.accent} mb-3`} />
              <p className="text-2xl font-extrabold font-mono">{s.value}</p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          );
          return s.link ? <Link key={s.label} to={s.link}>{Inner}</Link> : Inner;
        })}
      </div>

      <div className="glass-strong rounded-3xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Order history</h2>
          <Link to="/wishlist" className="text-xs text-cyan flex items-center gap-1">
            <Heart className="size-3.5" /> Wishlist
          </Link>
        </div>

        {loadingOrders ? (
          <p className="text-muted-foreground text-sm">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground">No orders yet.</p>
            <Link to="/shop" className="mt-4 inline-block px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
              Start shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o, i) => {
              const items = (o as any).order_items ?? [];
              const first = items[0];
              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to="/orders/$id"
                    params={{ id: o.id }}
                    className="glass rounded-2xl p-4 flex items-center gap-4 hover:glass-strong transition-all"
                  >
                    <div className="size-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                      {first?.image && <img src={first.image} alt="" className="size-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        {first?.title ?? "Order"}
                        {items.length > 1 && <span className="text-muted-foreground text-sm"> +{items.length - 1} more</span>}
                      </p>
                      <p className="text-xs font-mono text-muted-foreground">
                        #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-cyan">{formatPrice(Number(o.total))}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${STATUS_TONE[o.status] ?? ""}`}>
                        {o.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
