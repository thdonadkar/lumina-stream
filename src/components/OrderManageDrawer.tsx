import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Package, MapPin, CreditCard, User, Store,
  RefreshCw, ShieldCheck, ShieldX, Receipt, History, Bell, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/cart-store";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  getOrderManageDetail, getOrderHistory, updateOrderStatus,
  approveReturn, rejectReturn, markRefunded,
} from "@/lib/orders.functions";

type Role = "admin" | "seller";

const FORWARD = ["pending", "confirmed", "packed", "shipped", "out_for_delivery", "delivered"] as const;
const SELLER_NEXT: Record<string, string | undefined> = {
  pending: "confirmed",
  confirmed: "packed",
  packed: "shipped",
  shipped: "out_for_delivery",
};
const ADMIN_NEXT: Record<string, string | undefined> = {
  ...SELLER_NEXT,
  out_for_delivery: "delivered",
};

const STATUS_LABEL = (s: string) => s.replace(/_/g, " ");
const TONE: Record<string, string> = {
  ok:   "text-emerald-300 ring-emerald-300/40 bg-emerald-300/10",
  warn: "text-amber-300 ring-amber-300/40 bg-amber-300/10",
  bad:  "text-rose-400 ring-rose-400/40 bg-rose-400/10",
  info: "text-cyan ring-cyan/40 bg-cyan/10",
  muted:"text-muted-foreground ring-white/15 bg-white/5",
};
function statusTone(s: string) {
  if (s === "cancelled") return "bad";
  if (["delivered", "returned", "refunded"].includes(s)) return "ok";
  if (["return_requested"].includes(s)) return "warn";
  return "info";
}

export function OrderManageDrawer({
  orderId,
  role,
  open,
  onOpenChange,
  onChanged,
}: {
  orderId: string | null;
  role: Role;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const fetchDetail = useServerFn(getOrderManageDetail);
  const fetchHistory = useServerFn(getOrderHistory);
  const updateStatus = useServerFn(updateOrderStatus);
  const approve = useServerFn(approveReturn);
  const reject = useServerFn(rejectReturn);
  const refund = useServerFn(markRefunded);
  const { confirm, prompt } = useConfirm();

  const [detail, setDetail] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pickStatus, setPickStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!orderId) return;
    setLoading(true);
    try {
      const [d, h] = await Promise.all([
        fetchDetail({ data: { id: orderId } }),
        fetchHistory({ data: { id: orderId } }).catch(() => []),
      ]);
      setDetail(d);
      setHistory(h ?? []);
      setPickStatus("");
    } catch (e: any) {
      toast.error(e.message ?? "Could not load order");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && orderId) load();
    if (!open) { setDetail(null); setHistory([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  const order = detail?.order;
  const items = detail?.items ?? [];
  const addr = order?.addresses;
  const customer = detail?.customer;
  const sellers = detail?.sellers ?? [];
  const payment = detail?.payment;

  const allowedNext = useMemo(() => {
    if (!order) return [] as string[];
    const map = role === "admin" ? ADMIN_NEXT : SELLER_NEXT;
    const n = map[order.status];
    return n ? [n] : [];
  }, [order, role]);

  async function withBusy(fn: () => Promise<any>, success: string) {
    setBusy(true);
    try { await fn(); toast.success(success); await load(); onChanged?.(); }
    catch (e: any) { toast.error(e.message ?? "Action failed"); }
    finally { setBusy(false); }
  }

  async function applyStatus(next: string) {
    if (!order || !next || next === order.status) return;
    if (!(await confirm({
      title: `Mark as ${STATUS_LABEL(next)}?`,
      description: "This will notify the customer and update the audit trail.",
      confirmText: `Mark ${STATUS_LABEL(next)}`,
    }))) return;
    await withBusy(() => updateStatus({ data: { id: order.id, status: next } }), `Marked ${STATUS_LABEL(next)}`);
  }

  const forwardStep = role === "admin" ? ADMIN_NEXT[order?.status] : SELLER_NEXT[order?.status];
  const terminal = ["cancelled", "returned", "refunded"].includes(order?.status ?? "");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {loading || !order ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            <SheetHeader className="space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {role === "admin" ? "Admin · Manage order" : "Seller · Manage order"}
                  </p>
                  <SheetTitle className="text-2xl font-extrabold tracking-tight font-mono">
                    #{order.id.slice(0, 8)}
                  </SheetTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ${TONE[statusTone(order.status)]}`}>
                    {STATUS_LABEL(order.status)}
                  </span>
                  {order.payment_status && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ${TONE.muted}`}>
                      pay: {order.payment_status}
                    </span>
                  )}
                  {order.refund_status && order.refund_status !== "none" && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ring-1 ${TONE.info}`}>
                      refund: {order.refund_status}
                    </span>
                  )}
                </div>
              </div>
              <SheetDescription className="text-xs">
                Placed {new Date(order.created_at).toLocaleString()}
                {" · "}Last updated {new Date(order.updated_at).toLocaleString()}
              </SheetDescription>
            </SheetHeader>

            {/* TIMELINE */}
            <section className="glass-strong rounded-2xl p-4">
              <Timeline status={order.status} />
            </section>

            {/* NEXT ACTION */}
            {!terminal && (
              <section className="glass-strong rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Next action</p>
                    <p className="text-sm">
                      Current: <span className="font-bold uppercase">{STATUS_LABEL(order.status)}</span>
                    </p>
                  </div>
                  {forwardStep && (
                    <button
                      disabled={busy}
                      onClick={() => applyStatus(forwardStep)}
                      className="rounded-full px-4 py-2 text-xs font-bold bg-aurora animate-aurora text-background disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="size-3.5" /> Mark {STATUS_LABEL(forwardStep)}
                    </button>
                  )}
                </div>

                {allowedNext.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                      or pick status
                    </span>
                    <Select value={pickStatus} onValueChange={setPickStatus}>
                      <SelectTrigger className="h-9 w-[200px] glass">
                        <SelectValue placeholder="Select next status" />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNext.map((s) => (
                          <SelectItem key={s} value={s} className="uppercase font-mono text-xs">
                            {STATUS_LABEL(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      disabled={!pickStatus || busy}
                      onClick={() => applyStatus(pickStatus)}
                      className="rounded-full px-3 py-1.5 text-xs font-bold glass-strong hover:bg-aurora hover:text-background disabled:opacity-40"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {role === "seller" && (
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Sellers progress orders one step forward. Delivery, cancellations, returns and refunds are handled by admin.
                  </p>
                )}
              </section>
            )}

            {/* ADMIN CONTROLS */}
            {role === "admin" && (
              <section className="glass-strong rounded-2xl p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">Admin controls</p>
                <div className="flex flex-wrap gap-2">
                  {!terminal && (
                    <button
                      disabled={busy}
                      onClick={async () => {
                        if (!(await confirm({ title: "Force cancel order?", description: "This cannot be undone.", destructive: true, confirmText: "Force cancel" }))) return;
                        await withBusy(() => updateStatus({ data: { id: order.id, status: "cancelled" as any } }), "Order cancelled");
                      }}
                      className="rounded-full px-3 py-1.5 text-xs glass hover:bg-rose-400/10 hover:text-rose-400 inline-flex items-center gap-1.5"
                    >
                      <XCircle className="size-3.5" /> Force cancel
                    </button>
                  )}
                  {order.status === "return_requested" && (
                    <>
                      <button
                        disabled={busy}
                        onClick={() => withBusy(() => approve({ data: { id: order.id } }), "Return approved")}
                        className="rounded-full px-3 py-1.5 text-xs font-bold bg-aurora text-background inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="size-3.5" /> Approve return
                      </button>
                      <button
                        disabled={busy}
                        onClick={async () => {
                          const r = await prompt({ title: "Reject return", description: "Optional reason for rejection.", placeholder: "Reason (optional)", confirmText: "Reject" });
                          if (r === null) return;
                          await withBusy(() => reject({ data: { id: order.id, reason: r ?? undefined } }), "Return rejected");
                        }}
                        className="rounded-full px-3 py-1.5 text-xs glass-strong text-rose-400 inline-flex items-center gap-1.5"
                      >
                        <ShieldX className="size-3.5" /> Reject return
                      </button>
                    </>
                  )}
                  {order.refund_status === "approved" && (
                    <button
                      disabled={busy}
                      onClick={() => withBusy(() => refund({ data: { id: order.id, amount: Number(order.total) } }), "Refund marked complete")}
                      className="rounded-full px-3 py-1.5 text-xs font-bold bg-aurora text-background inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="size-3.5" /> Mark refunded ({formatPrice(Number(order.total))})
                    </button>
                  )}
                  {order.refund_status === "pending" && (
                    <button
                      disabled={busy}
                      onClick={() => withBusy(() => refund({ data: { id: order.id, amount: Number(order.total) } }), "Refund processed")}
                      className="rounded-full px-3 py-1.5 text-xs font-bold bg-aurora text-background inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="size-3.5" /> Process refund
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* PEOPLE */}
            <div className="grid sm:grid-cols-2 gap-3">
              <InfoCard icon={<User className="size-4 text-cyan" />} title="Customer">
                <p className="text-sm font-semibold">{customer?.display_name ?? "Customer"}</p>
                {customer?.phone && <p className="text-xs text-muted-foreground">{customer.phone}</p>}
                <p className="text-[10px] font-mono text-muted-foreground mt-1">
                  ID: {String(order.user_id).slice(0, 8)}
                </p>
              </InfoCard>

              <InfoCard icon={<Store className="size-4 text-cyan" />} title={role === "admin" ? "Sellers" : "You (seller)"}>
                {sellers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No seller profile linked.</p>
                ) : (
                  <ul className="space-y-1">
                    {sellers.map((s: any) => (
                      <li key={s.id} className="text-sm">
                        <span className="font-semibold">{s.display_name ?? "Seller"}</span>
                        {s.phone && <span className="text-xs text-muted-foreground"> · {s.phone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </InfoCard>

              {addr && (
                <InfoCard icon={<MapPin className="size-4 text-cyan" />} title="Shipping address" className="sm:col-span-2">
                  <p className="text-sm">{addr.recipient}{addr.phone ? ` · ${addr.phone}` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />
                    {addr.city}, {addr.state} {addr.postal_code}<br />
                    {addr.country}
                  </p>
                </InfoCard>
              )}
            </div>

            {/* ITEMS */}
            <section className="glass-strong rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                <Package className="size-4 text-cyan" /> Products
                {role === "seller" && (
                  <span className="text-[10px] text-muted-foreground font-mono">(only yours)</span>
                )}
              </h3>
              <div className="space-y-2">
                {items.map((i: any) => (
                  <div key={i.id} className="flex items-center gap-3 glass rounded-xl p-2.5">
                    <div className="size-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                      {i.image && <img src={i.image} referrerPolicy="no-referrer" alt="" className="size-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{i.title}</p>
                      <p className="text-[11px] text-muted-foreground">Qty {i.qty} · {formatPrice(Number(i.unit_price))}</p>
                    </div>
                    <p className="font-mono font-bold text-sm">{formatPrice(Number(i.unit_price) * i.qty)}</p>
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground">No line items visible to you.</p>
                )}
              </div>
            </section>

            {/* PAYMENT & SUMMARY */}
            <section className="glass-strong rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                <CreditCard className="size-4 text-cyan" /> Payment & invoice
              </h3>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <Row label="Method" value={order.payment_method ?? "—"} />
                  <Row label="Status" value={order.payment_status ?? "—"} />
                  {payment?.provider && <Row label="Provider" value={payment.provider} />}
                  {payment?.provider_payment_id && (
                    <Row label="Payment ref" value={String(payment.provider_payment_id).slice(0, 14) + "…"} />
                  )}
                  {order.coupon_code && <Row label="Coupon" value={order.coupon_code} />}
                </div>
                <div className="space-y-1">
                  <Row label="Subtotal" value={formatPrice(Number(order.subtotal))} />
                  {Number(order.discount) > 0 && <Row label="Discount" value={`− ${formatPrice(Number(order.discount))}`} />}
                  <Row label="Shipping" value={Number(order.shipping) === 0 ? "Free" : formatPrice(Number(order.shipping))} />
                  <Row label="GST" value={formatPrice(Number(order.tax))} />
                  <div className="border-t border-white/10 my-1" />
                  <Row label="Total" value={formatPrice(Number(order.total))} bold />
                </div>
              </div>
              {order.notes && (
                <div className="mt-3 glass rounded-xl p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Customer notes</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
              <div className="mt-3">
                <Link
                  to="/orders/$id"
                  params={{ id: order.id }}
                  className="inline-flex items-center gap-1.5 text-xs glass-strong hover:bg-aurora hover:text-background transition-all px-3 py-1.5 rounded-full"
                >
                  <Receipt className="size-3.5" /> Open invoice page
                  <ExternalLink className="size-3" />
                </Link>
              </div>
            </section>

            {/* HISTORY */}
            <section className="glass-strong rounded-2xl p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm">
                <History className="size-4 text-cyan" /> Audit history
              </h3>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No status changes recorded yet.</p>
              ) : (
                <ol className="space-y-2">
                  {history.map((h) => {
                    const m = h.metadata ?? {};
                    return (
                      <li key={h.id} className="glass rounded-xl p-3 text-xs flex items-center justify-between gap-3 flex-wrap">
                        <div className="font-mono">
                          <span className="uppercase tracking-wider">
                            {String(h.action).replace(/^order\./, "").replace(/_/g, " ")}
                          </span>
                          {(m.previous_status || m.new_status) && (
                            <span className="text-muted-foreground"> · {m.previous_status ?? "—"} → {m.new_status ?? "—"}</span>
                          )}
                        </div>
                        <div className="text-muted-foreground font-mono">
                          by {m.by_role ?? "system"} · {new Date(h.created_at).toLocaleString()}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className="glass rounded-2xl p-3 text-xs text-muted-foreground flex items-center gap-2">
              <Bell className="size-3.5" />
              Status changes auto-notify the customer{role === "admin" ? ", sellers and admins" : " and admin"}.
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function InfoCard({
  icon, title, children, className,
}: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-strong rounded-2xl p-4 ${className ?? ""}`}>
      <h4 className="font-bold mb-2 flex items-center gap-2 text-sm">{icon} {title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "font-bold text-base" : ""}`}>
      <span className="text-muted-foreground capitalize">{label}</span>
      <span className={`${bold ? "font-mono text-gradient" : "font-mono"}`}>{value}</span>
    </div>
  );
}

function Timeline({ status }: { status: string }) {
  const steps = (() => {
    if (status === "cancelled") {
      return [
        { key: "pending", label: "Pending", done: true, current: false, bad: false },
        { key: "confirmed", label: "Confirmed", done: true, current: false, bad: false },
        { key: "cancelled", label: "Cancelled", done: true, current: true, bad: true },
      ];
    }
    if (["return_requested", "returned", "refunded"].includes(status)) {
      const stages = [
        { key: "delivered", label: "Delivered" },
        { key: "return_requested", label: "Return requested" },
        { key: "returned", label: "Returned" },
        { key: "refunded", label: "Refunded" },
      ];
      const idx = stages.findIndex((s) => s.key === status);
      return stages.map((s, i) => ({ ...s, done: i <= idx, current: i === idx, bad: false }));
    }
    const idx = FORWARD.indexOf(status as any);
    return FORWARD.map((s, i) => ({
      key: s,
      label: STATUS_LABEL(s),
      done: i <= idx,
      current: i === idx,
      bad: false,
    }));
  })();

  return (
    <ol className="flex items-start gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => (
        <li key={s.key} className="flex-1 min-w-[72px] flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`size-8 rounded-full grid place-items-center ${
              s.bad ? "bg-rose-400 text-background"
              : s.done ? "bg-aurora text-background shadow-glow-cyan"
              : "glass text-muted-foreground"
            }`}
          >
            {s.bad ? <XCircle className="size-4" />
              : s.done ? <CheckCircle2 className="size-4" />
              : <span className="text-[10px] font-mono">{i + 1}</span>}
          </motion.div>
          <p className={`text-[9px] mt-1.5 uppercase font-mono leading-tight ${
            s.current ? "text-cyan font-bold" : s.done ? "text-cyan/70" : "text-muted-foreground"
          }`}>
            {s.label}
          </p>
        </li>
      ))}
    </ol>
  );
}
