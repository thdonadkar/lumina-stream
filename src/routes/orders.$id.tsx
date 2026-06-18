import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, Package, MapPin, CreditCard, CheckCircle2, RotateCcw, XCircle, LifeBuoy, Download } from "lucide-react";
import { toast } from "sonner";
import { getOrder, requestReturn, cancelOrder } from "@/lib/orders.functions";
import { createTicket } from "@/lib/support.functions";
import { downloadInvoice } from "@/lib/invoice";
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
  const [returnOpen, setReturnOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const fetchOrder = useServerFn(getOrder);
  const doReturn = useServerFn(requestReturn);
  const doCancel = useServerFn(cancelOrder);
  const openTicket = useServerFn(createTicket);

  function refresh() {
    fetchOrder({ data: { id } }).then(setOrder).finally(() => setLoading(false));
  }
  useEffect(refresh, [id, fetchOrder]);

  async function submitReturn(e: React.FormEvent) {
    e.preventDefault();
    try {
      await doReturn({ data: { id, reason } });
      toast.success("Return requested");
      setReturnOpen(false); setReason(""); refresh();
    } catch (err: any) { toast.error(err.message); }
  }
  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    try {
      await doCancel({ data: { id } });
      toast.success("Order cancelled"); refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  async function submitHelp(e: React.FormEvent) {
    e.preventDefault();
    try {
      await openTicket({ data: { subject: helpSubject, message: helpMessage, orderId: id } });
      toast.success("Support ticket opened — seller and our team have been notified");
      setHelpOpen(false); setHelpSubject(""); setHelpMessage("");
    } catch (err: any) { toast.error(err.message); }
  }

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
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-aurora text-background text-xs font-bold uppercase">{order.status.replace(/_/g, " ")}</span>
            {order.refund_status && order.refund_status !== "none" && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ring-1 ${
                order.refund_status === "refunded" ? "text-emerald-300 ring-emerald-300/40 bg-emerald-300/10" :
                order.refund_status === "approved" ? "text-cyan ring-cyan/40 bg-cyan/10" :
                order.refund_status === "rejected" ? "text-rose-400 ring-rose-400/40 bg-rose-400/10" :
                "text-amber-300 ring-amber-300/40 bg-amber-300/10"
              }`}>refund: {order.refund_status}</span>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Placed {new Date(order.created_at).toLocaleString()}</p>

        {order.return_reason && (
          <div className="mt-4 glass rounded-xl p-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Return reason</p>
            <p className="text-sm">{order.return_reason}</p>
            {order.refund_amount && <p className="text-xs text-emerald-300 mt-2">Refund issued: {formatPrice(Number(order.refund_amount))}</p>}
          </div>
        )}

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
                  {s.replace(/_/g, " ")}
                </p>
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

          {(order.status === "pending" || order.status === "confirmed") && (
            <button onClick={handleCancel} className="w-full rounded-2xl glass-strong hover:bg-rose-400/10 hover:text-rose-400 transition-all p-3 text-sm font-bold inline-flex items-center justify-center gap-2">
              <XCircle className="size-4" /> Cancel order
            </button>
          )}
          {order.status === "delivered" && !returnOpen && (
            <button onClick={() => setReturnOpen(true)} className="w-full rounded-2xl glass-strong hover:glass transition-all p-3 text-sm font-bold inline-flex items-center justify-center gap-2">
              <RotateCcw className="size-4" /> Request return
            </button>
          )}
          {returnOpen && (
            <form onSubmit={submitReturn} className="glass-strong rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold">Return reason</p>
              <textarea
                value={reason} onChange={(e) => setReason(e.target.value)} required maxLength={500} rows={3}
                placeholder="Tell us what went wrong…"
                className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan resize-y"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReturnOpen(false)} className="rounded-full px-3 py-1.5 text-xs glass">Cancel</button>
                <button className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background">Submit return</button>
              </div>
            </form>
          )}

          {!helpOpen ? (
            <button onClick={() => setHelpOpen(true)} className="w-full rounded-2xl glass-strong hover:glass transition-all p-3 text-sm font-bold inline-flex items-center justify-center gap-2">
              <LifeBuoy className="size-4" /> Need help with this order?
            </button>
          ) : (
            <form onSubmit={submitHelp} className="glass-strong rounded-2xl p-4 space-y-2">
              <p className="text-sm font-bold">Contact support</p>
              <input
                value={helpSubject} onChange={(e) => setHelpSubject(e.target.value)} required maxLength={200}
                placeholder="Subject"
                className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan"
              />
              <textarea
                value={helpMessage} onChange={(e) => setHelpMessage(e.target.value)} required maxLength={4000} rows={3}
                placeholder="Describe the issue. The seller and our team will both see this."
                className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan resize-y"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setHelpOpen(false)} className="rounded-full px-3 py-1.5 text-xs glass">Cancel</button>
                <button className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background">Open ticket</button>
              </div>
            </form>
          )}
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
