import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, Package, MapPin, CreditCard, CheckCircle2 } from "lucide-react";
import { getOrder } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Order — Neural" }] }),
  component: OrderDetail,
});

const TIMELINE = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"];

function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const fetchOrder = useServerFn(getOrder);

  useEffect(() => {
    fetchOrder({ data: { id } })
      .then(setOrder)
      .finally(() => setLoading(false));
  }, [id, fetchOrder]);

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!order) return <div className="p-20 text-center">Order not found.</div>;

  const items = order.order_items ?? [];
  const addr = order.addresses;
  const statusIdx = TIMELINE.indexOf(order.status);

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto pb-24">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ChevronLeft className="size-4" /> Back to orders
      </Link>

      <div className="glass-strong rounded-3xl p-6 md:p-8 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Order</p>
            <h1 className="text-3xl font-extrabold tracking-tighter font-mono">#{order.id.slice(0, 8)}</h1>
          </div>
          <span className="px-3 py-1 rounded-full bg-aurora text-background text-xs font-bold uppercase">{order.status.replace("_", " ")}</span>
        </div>
        <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>

        {statusIdx >= 0 && (
          <div className="mt-8 flex items-center justify-between gap-1">
            {TIMELINE.map((s, i) => (
              <div key={s} className="flex-1 flex flex-col items-center text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className={`size-9 rounded-full grid place-items-center ${
                    i <= statusIdx ? "bg-aurora text-background shadow-glow-cyan" : "glass text-muted-foreground"
                  }`}
                >
                  {i <= statusIdx ? <CheckCircle2 className="size-4" /> : <span className="text-xs font-mono">{i + 1}</span>}
                </motion.div>
                <p className={`text-[10px] mt-2 uppercase font-mono ${i <= statusIdx ? "text-cyan" : "text-muted-foreground"}`}>
                  {s.replace("_", " ")}
                </p>
                {i < TIMELINE.length - 1 && (
                  <div className={`absolute h-px ${i < statusIdx ? "bg-cyan" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="glass-strong rounded-3xl p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2"><Package className="size-4 text-cyan" /> Items</h2>
          <div className="space-y-3">
            {items.map((i: any) => (
              <div key={i.id} className="flex gap-3 items-center glass rounded-2xl p-3">
                <div className="size-16 rounded-xl bg-secondary overflow-hidden shrink-0">
                  {i.image && <img src={i.image} alt="" className="size-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{i.title}</p>
                  <p className="text-xs text-muted-foreground">Qty {i.qty} · {formatPrice(Number(i.unit_price))}</p>
                </div>
                <p className="font-mono font-bold">{formatPrice(Number(i.unit_price) * i.qty)}</p>
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {addr && (
            <div className="glass-strong rounded-2xl p-5">
              <h3 className="font-bold mb-2 flex items-center gap-2"><MapPin className="size-4 text-cyan" /> Shipping to</h3>
              <p className="text-sm">{addr.recipient}</p>
              <p className="text-xs text-muted-foreground">
                {addr.line1}<br />
                {addr.city}, {addr.state} {addr.postal_code}<br />
                {addr.country}
              </p>
            </div>
          )}
          <div className="glass-strong rounded-2xl p-5">
            <h3 className="font-bold mb-3 flex items-center gap-2"><CreditCard className="size-4 text-cyan" /> Summary</h3>
            <div className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatPrice(Number(order.subtotal))} />
              {Number(order.discount) > 0 && <Row label={`Discount (${order.coupon_code})`} value={`− ${formatPrice(Number(order.discount))}`} />}
              <Row label="Shipping" value={Number(order.shipping) === 0 ? "Free" : formatPrice(Number(order.shipping))} />
              <Row label="GST" value={formatPrice(Number(order.tax))} muted />
              <div className="border-t border-white/10 my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="font-mono text-gradient">{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
