import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const STATUSES = ["all", "pending", "packed", "shipped", "delivered", "return_requested"] as const;
type Status = (typeof STATUSES)[number];

const SEED = [
  { id: "ORD-4821", user: "alex@neural.app", total: 2499, status: "pending" },
  { id: "ORD-4822", user: "priya@neural.app", total: 820, status: "shipped" },
  { id: "ORD-4823", user: "hiro@neural.app", total: 499, status: "delivered" },
  { id: "ORD-4824", user: "nour@neural.app", total: 390, status: "packed" },
  { id: "ORD-4825", user: "kai@neural.app", total: 1299, status: "return_requested" },
  { id: "ORD-4826", user: "mira@neural.app", total: 78, status: "delivered" },
  { id: "ORD-4827", user: "jules@neural.app", total: 3450, status: "pending" },
  { id: "ORD-4828", user: "rina@neural.app", total: 260, status: "shipped" },
  { id: "ORD-4829", user: "theo@neural.app", total: 195, status: "delivered" },
  { id: "ORD-4830", user: "ines@neural.app", total: 480, status: "packed" },
  { id: "ORD-4831", user: "owen@neural.app", total: 720, status: "pending" },
  { id: "ORD-4832", user: "sana@neural.app", total: 110, status: "delivered" },
];

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 ring-amber-300/30",
  packed: "text-purple ring-purple/30",
  shipped: "text-cyan ring-cyan/30",
  delivered: "text-emerald-300 ring-emerald-300/30",
  return_requested: "text-rose-400 ring-rose-400/30",
};

function Page() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Status>("all");

  const rows = useMemo(
    () =>
      SEED.filter((o) => (filter === "all" ? true : o.status === filter)).filter(
        (o) => o.id.toLowerCase().includes(q.toLowerCase()) || o.user.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, filter],
  );

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-rose-400 font-mono">Admin</p>
        <h1 className="text-4xl font-extrabold tracking-tighter">All orders</h1>
      </header>

      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by order ID or customer…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
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
              {s.replace("_", " ")}
            </button>
          );
        })}
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4">Order</th>
              <th className="text-left p-4 hidden sm:table-cell">Customer</th>
              <th className="text-right p-4">Total</th>
              <th className="text-right p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o, i) => (
              <motion.tr
                key={o.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
                <td className="p-4 font-mono">{o.id}</td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{o.user}</td>
                <td className="p-4 text-right font-mono">${o.total.toLocaleString()}</td>
                <td className="p-4 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider ring-1 ${STATUS_TONE[o.status]}`}>
                    {o.status.replace("_", " ")}
                  </span>
                </td>
              </motion.tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">No orders match.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminNav />
    </div>
  );
}
