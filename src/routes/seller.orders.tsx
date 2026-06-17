import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Package2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/orders")({
  head: () => ({ meta: [{ title: "Orders — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

const MOCK = [
  { id: "ORD-4821", customer: "Alex M.", item: "Void Receptor", total: 2499, status: "pending" },
  { id: "ORD-4822", customer: "Priya S.", item: "Echo Implants", total: 820, status: "shipped" },
  { id: "ORD-4823", customer: "Hiro T.", item: "Onyx Controller", total: 499, status: "delivered" },
  { id: "ORD-4824", customer: "Nour K.", item: "Chronos Band", total: 390, status: "packed" },
];

const NEXT: Record<string, string> = {
  pending: "packed", packed: "shipped", shipped: "out_for_delivery", out_for_delivery: "delivered",
};

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Incoming orders</h1>

      <div className="grid gap-3">
        {MOCK.map((o, i) => (
          <motion.div
            key={o.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-strong rounded-2xl p-4 flex items-center gap-4 flex-wrap"
          >
            <div className="size-12 rounded-xl bg-aurora animate-aurora grid place-items-center text-background">
              <Package2 className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-muted-foreground">{o.id}</p>
              <p className="font-bold truncate">{o.item}</p>
              <p className="text-xs text-muted-foreground">Customer: {o.customer}</p>
            </div>
            <p className="font-mono font-bold">${o.total.toLocaleString()}</p>
            <span className="px-3 py-1 rounded-full glass text-[11px] uppercase font-mono tracking-wider">
              {o.status.replace("_", " ")}
            </span>
            {NEXT[o.status] && (
              <button
                onClick={() => toast.success(`Marked as ${NEXT[o.status].replace("_", " ")}`)}
                className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora animate-aurora text-background"
              >
                Mark {NEXT[o.status].replace("_", " ")}
              </button>
            )}
          </motion.div>
        ))}
      </div>

      <SellerNav />
    </div>
  );
}
