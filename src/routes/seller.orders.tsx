import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Package2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { listSellerOrders, updateOrderStatus } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({ meta: [{ title: "Orders — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

const NEXT: Record<string, string> = {
  pending: "confirmed",
  confirmed: "packed",
  packed: "shipped",
  shipped: "out_for_delivery",
  out_for_delivery: "delivered",
};

function Page() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchOrders = useServerFn(listSellerOrders);
  const updateStatus = useServerFn(updateOrderStatus);

  const load = () => {
    setLoading(true);
    fetchOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [fetchOrders]);

  async function advance(o: any) {
    const next = NEXT[o.status];
    if (!next) return;
    try {
      await updateStatus({ data: { id: o.id, status: next } });
      toast.success(`Marked ${next.replace("_", " ")}`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-4xl font-extrabold tracking-tighter">Incoming orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Orders containing your products · live data</p>
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
                className="glass-strong rounded-2xl p-4 flex items-center gap-4 flex-wrap"
              >
                <div className="size-12 rounded-xl bg-aurora animate-aurora grid place-items-center text-background">
                  <Package2 className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}</p>
                  <p className="font-bold truncate">{first?.title ?? "Order"}{items.length > 1 ? ` +${items.length - 1} more` : ""}</p>
                </div>
                <p className="font-mono font-bold">{formatPrice(Number(o.total))}</p>
                <span className="px-3 py-1 rounded-full glass text-[11px] uppercase font-mono tracking-wider">
                  {o.status.replace(/_/g, " ")}
                </span>
                {NEXT[o.status] && (
                  <button
                    onClick={() => advance(o)}
                    className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora animate-aurora text-background"
                  >
                    Mark {NEXT[o.status].replace("_", " ")}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <SellerNav />
    </div>
  );
}
