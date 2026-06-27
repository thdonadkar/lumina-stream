import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Search, Filter, Settings2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listAllOrders } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";
import { OrderManageDrawer } from "@/components/OrderManageDrawer";

export const Route = createFileRoute("/admin/orders")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const STATUSES = ["all", "pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled", "return_requested", "returned"] as const;
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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const fetchOrders = useServerFn(listAllOrders);

  const load = () => {
    setLoading(true);
    fetchOrders().then(setOrders).finally(() => setLoading(false));
  };
  useEffect(load, [fetchOrders]);

  const rows = useMemo(
    () =>
      orders
        .filter((o) => (filter === "all" ? true : o.status === filter))
        .filter((o) => o.id.toLowerCase().includes(q.toLowerCase())),
    [q, filter, orders],
  );

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-rose-400 font-mono">Admin</p>
        <h1 className="text-4xl font-extrabold tracking-tighter">All orders</h1>
        <p className="text-sm text-muted-foreground mt-1">{orders.length} total · click Manage to operate</p>
      </header>

      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by order ID…" className="flex-1 bg-transparent outline-none text-sm" />
        <Filter className="size-4 text-muted-foreground" />
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {STATUSES.map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase ${
                active ? "bg-aurora animate-aurora text-background font-bold" : "glass hover:glass-strong text-muted-foreground"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-muted-foreground text-sm">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr className="border-b border-white/5">
                  <th className="text-left p-4">Order</th>
                  <th className="text-left p-4 hidden sm:table-cell">Placed</th>
                  <th className="text-left p-4 hidden md:table-cell">Items</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4 hidden md:table-cell">Payment</th>
                  <th className="text-right p-4">Status</th>
                  <th className="text-right p-4 hidden lg:table-cell">Updated</th>
                  <th className="text-right p-4">Manage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, i) => (
                  <motion.tr
                    key={o.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    onClick={() => setOpenId(o.id)}
                    className="border-b border-white/5 hover:bg-white/[0.03] cursor-pointer"
                  >
                    <td className="p-4 font-mono text-xs">#{o.id.slice(0, 8)}</td>
                    <td className="p-4 hidden sm:table-cell text-muted-foreground text-xs">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 hidden md:table-cell text-xs text-muted-foreground">
                      {(o.order_items ?? []).length} item{(o.order_items ?? []).length === 1 ? "" : "s"}
                    </td>
                    <td className="p-4 text-right font-mono">{formatPrice(Number(o.total))}</td>
                    <td className="p-4 text-right hidden md:table-cell text-[11px] uppercase font-mono text-muted-foreground">
                      {o.payment_status ?? "—"}
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider ring-1 ${STATUS_TONE[o.status] ?? ""}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-4 text-right hidden lg:table-cell text-[11px] text-muted-foreground font-mono">
                      {new Date(o.updated_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenId(o.id); }}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-aurora animate-aurora text-background font-bold"
                      >
                        <Settings2 className="size-3.5" /> Manage
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">No orders match.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderManageDrawer
        orderId={openId}
        role="admin"
        open={!!openId}
        onOpenChange={(v) => !v && setOpenId(null)}
        onChanged={load}
      />

      <AdminNav />
    </div>
  );
}
