import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Package2, Settings2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { listSellerOrders } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";
import { OrderManageDrawer } from "@/components/OrderManageDrawer";

export const Route = createFileRoute("/seller/orders")({
  ssr: false,
  beforeLoad: () => requireRole("seller"),
  head: () => ({ meta: [{ title: "Orders — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 ring-amber-300/30",
  confirmed: "text-amber-200 ring-amber-200/30",
  packed: "text-purple ring-purple/30",
  shipped: "text-cyan ring-cyan/30",
  out_for_delivery: "text-cyan ring-cyan/30",
  delivered: "text-emerald-300 ring-emerald-300/30",
  cancelled: "text-rose-400 ring-rose-400/30",
  return_requested: "text-rose-400 ring-rose-400/30",
  returned: "text-rose-300 ring-rose-300/30",
};

function Page() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const fetchOrders = useServerFn(listSellerOrders);

  const load = () => {
    setLoading(true);
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [fetchOrders]);

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tighter">Incoming orders</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Orders containing your products · click Manage for full details
        </p>
      </header>

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <Package2 className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No orders yet.</p>
          <Link to="/seller/add-product" className="mt-4 inline-block px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map((o, i) => {
            const items = o.order_items ?? [];
            const first = items[0];
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setOpenId(o.id)}
                className="glass-strong rounded-2xl p-4 flex items-center gap-4 flex-wrap cursor-pointer hover:bg-white/[0.03] transition-colors"
              >
                <div className="size-12 rounded-xl bg-aurora animate-aurora grid place-items-center text-background">
                  <Package2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">
                    #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                  <p className="font-bold truncate">
                    {first?.title ?? "Order"}
                    {items.length > 1 ? ` +${items.length - 1} more` : ""}
                  </p>
                </div>
                <p className="font-mono font-bold">{formatPrice(Number(o.total))}</p>
                <span className={`px-3 py-1 rounded-full text-[11px] uppercase font-mono tracking-wider ring-1 ${STATUS_TONE[o.status] ?? "ring-white/10"}`}>
                  {o.status.replace(/_/g, " ")}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setOpenId(o.id); }}
                  className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-1.5"
                >
                  <Settings2 className="size-3.5" /> Manage
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <OrderManageDrawer
        orderId={openId}
        role="seller"
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        onChanged={load}
      />

      <SellerNav />
    </div>
  );
}
