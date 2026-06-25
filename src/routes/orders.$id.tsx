import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, Package, MapPin, CreditCard, CheckCircle2, RotateCcw, XCircle, LifeBuoy, Download } from "lucide-react";
import { toast } from "sonner";
import { getOrder, requestReturn, cancelOrder } from "@/lib/orders.functions";
import { createTicket, listMyTickets } from "@/lib/support.functions";
import { downloadInvoice } from "@/lib/invoice";
import { formatPrice } from "@/lib/cart-store";
import { useConfirm } from "@/components/ConfirmDialog";
import { ReturnForm } from "@/components/ReturnForm";

export const Route = createFileRoute("/orders/$id")({
  head: () => ({ meta: [{ title: "Order — AtomSpot" }] }),
  component: OrderDetail,
});

const FORWARD_TIMELINE = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"];
const CANCEL_TIMELINE = ["pending", "confirmed", "cancelled"];
const RETURN_TIMELINE = ["delivered", "return_requested", "returned", "refunded"];

function pickTimeline(status: string) {
  if (status === "cancelled") return CANCEL_TIMELINE;
  if (["return_requested", "returned", "refunded"].includes(status)) return RETURN_TIMELINE;
  return FORWARD_TIMELINE;
}

function paymentLabel(order: any): { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" } {
  const ps = order.payment_status ?? "pending";
  const pm = order.payment_method;
  if (ps === "paid" && pm === "cod") return { label: "Cash on Delivery", tone: "ok" };
  if (ps === "paid") return { label: "Paid", tone: "ok" };
  if (ps === "authorized") return { label: "Authorized", tone: "info" };
  if (ps === "failed") return { label: "Failed", tone: "bad" };
  if (ps === "refunded") return { label: "Refunded", tone: "info" };
  if (ps === "not_applicable") return { label: "Not Applicable", tone: "muted" };
  // pending: COD before delivery vs online not-yet-captured
  return { label: pm === "cod" ? "Pending (COD)" : "Pending", tone: "warn" };
}

function statusTone(status: string) {
  if (["cancelled"].includes(status)) return "bad";
  if (["delivered", "returned", "refunded"].includes(status)) return "ok";
  if (["return_requested"].includes(status)) return "warn";
  return "info";
}

const TONE_CLASS: Record<string, string> = {
  ok:   "text-emerald-300 ring-emerald-300/40 bg-emerald-300/10",
  warn: "text-amber-300 ring-amber-300/40 bg-amber-300/10",
  bad:  "text-rose-400 ring-rose-400/40 bg-rose-400/10",
  info: "text-cyan ring-cyan/40 bg-cyan/10",
  muted:"text-muted-foreground ring-white/15 bg-white/5",
};


function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [returnOpen, setReturnOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSubject, setHelpSubject] = useState("");
  const [helpMessage, setHelpMessage] = useState("");
  const fetchOrder = useServerFn(getOrder);
  const doReturn = useServerFn(requestReturn);
  const doCancel = useServerFn(cancelOrder);
  const openTicket = useServerFn(createTicket);
  const listTickets = useServerFn(listMyTickets);
  const { confirm } = useConfirm();
  const navigate = useNavigate();

  function refresh() {
    fetchOrder({ data: { id } }).then(setOrder).finally(() => setLoading(false));
  }
  useEffect(refresh, [id, fetchOrder]);

  async function submitReturn(payload: { reason: string; description: string; order_item_id: string | null; photos: string[] }) {
    try {
      await doReturn({ data: { id, ...payload } });
      toast.success("Return requested");
      setReturnOpen(false);
      refresh();
    } catch (err: any) {
      toast.error(err.message);
    }
  }
  async function handleCancel() {
    if (!(await confirm({ title: "Cancel this order?", description: "This action cannot be undone.", destructive: true, confirmText: "Cancel order", cancelText: "Keep order" }))) return;
    try {
      await doCancel({ data: { id } });
      toast.success("Order cancelled"); refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  async function openHelp() {
    try {
      const tickets = await listTickets();
      const existing = tickets.find((t: any) => t.order_id === id && (t.status === "open" || t.status === "in_progress"));
      if (existing) {
        toast.info("You already have an open ticket for this order — opening it.");
        navigate({ to: "/support" });
        return;
      }
    } catch { /* fall through to form */ }
    setHelpOpen(true);
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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-aurora text-background text-xs font-bold uppercase">{order.status.replace(/_/g, " ")}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ring-1 ${
              order.payment_status === "paid" ? "text-emerald-300 ring-emerald-300/40 bg-emerald-300/10" :
              order.payment_status === "failed" ? "text-rose-400 ring-rose-400/40 bg-rose-400/10" :
              order.payment_status === "refunded" ? "text-cyan ring-cyan/40 bg-cyan/10" :
              "text-amber-300 ring-amber-300/40 bg-amber-300/10"
            }`}>payment: {order.payment_status ?? "paid"}</span>
            {order.refund_status && order.refund_status !== "none" && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ring-1 ${
                order.refund_status === "refunded" ? "text-emerald-300 ring-emerald-300/40 bg-emerald-300/10" :
                order.refund_status === "approved" ? "text-cyan ring-cyan/40 bg-cyan/10" :
                order.refund_status === "rejected" ? "text-rose-400 ring-rose-400/40 bg-rose-400/10" :
                "text-amber-300 ring-amber-300/40 bg-amber-300/10"
              }`}>refund: {order.refund_status}</span>
            )}
            <button
              onClick={() => downloadInvoice(order)}
              className="px-3 py-1 rounded-full glass-strong hover:bg-aurora hover:text-background transition-all text-xs font-bold inline-flex items-center gap-1.5"
              title="Download invoice"
            >
              <Download className="size-3.5" /> Invoice
            </button>
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
          <div className="mt-8">
            {/* Mobile/tablet: vertical timeline with connecting rail */}
            <ol className="md:hidden relative">
              <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gradient-to-b from-aurora via-cyan/40 to-white/5" aria-hidden="true" />
              {TIMELINE.map((s, i) => {
                const done = i <= statusIdx;
                const current = i === statusIdx;
                return (
                  <li key={s} className="relative flex items-center gap-4 py-2.5">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: current ? [1, 1.15, 1] : 1 }}
                      transition={{ delay: i * 0.05, duration: current ? 1.6 : 0.3, repeat: current ? Infinity : 0 }}
                      className={`relative z-10 size-9 rounded-full grid place-items-center shrink-0 ${
                        done ? "bg-aurora text-background shadow-glow-cyan" : "glass text-muted-foreground"
                      }`}
                    >
                      {done && !current ? <CheckCircle2 className="size-4" /> : <span className="text-xs font-mono font-bold">{i + 1}</span>}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm uppercase font-mono tracking-wider truncate ${current ? "text-cyan font-bold" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.replace(/_/g, " ")}
                      </p>
                      {current && <p className="text-[10px] text-cyan/70 font-mono mt-0.5">● current status</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
            {/* Desktop: horizontal timeline */}
            <div className="hidden md:block">
              <div className="flex items-start justify-between gap-1">
                {TIMELINE.map((s, i) => (
                  <div key={s} className="flex-1 flex flex-col items-center text-center min-w-[64px]">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`size-9 rounded-full grid place-items-center shrink-0 ${
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
            </div>
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
                  {i.image && <img referrerPolicy="no-referrer" src={i.image} alt="" className="size-full object-cover" />}
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
            <ReturnForm
              items={items.map((i: any) => ({ id: i.id, title: i.title, image: i.image }))}
              onCancel={() => setReturnOpen(false)}
              onSubmit={submitReturn}
            />
          )}

          {!helpOpen ? (
            <button onClick={openHelp} className="w-full rounded-2xl glass-strong hover:glass transition-all p-3 text-sm font-bold inline-flex items-center justify-center gap-2">
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
