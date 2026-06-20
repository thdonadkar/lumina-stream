import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, CreditCard, MapPin, Truck, Sparkles, Plus, Trash2, Tag } from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { listAddresses, saveAddress, deleteAddress } from "@/lib/addresses.functions";
import { validateCoupon, placeOrder } from "@/lib/orders.functions";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/payments.functions";
import { toast } from "sonner";

// Lazy-load Razorpay Checkout script the first time it's needed.
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Neural" }] }),
  component: Checkout,
});

const steps = [
  { id: 0, label: "Address", icon: MapPin },
  { id: 1, label: "Delivery", icon: Truck },
  { id: 2, label: "Payment", icon: CreditCard },
];

type Address = Awaited<ReturnType<typeof listAddresses>>[number];

function Checkout() {
  const { items, total, clear } = useCart();
  const { userId, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<{ id: string; total: number } | null>(null);
  const [delivery, setDelivery] = useState<"standard" | "express" | "drone">("express");

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
  const [showAddrForm, setShowAddrForm] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [coupon, setCoupon] = useState<{ code: string; discount: number; freeShipping: boolean } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");

  const listAddrs = useServerFn(listAddresses);
  const saveAddrFn = useServerFn(saveAddress);
  const delAddrFn = useServerFn(deleteAddress);
  const validateCouponFn = useServerFn(validateCoupon);
  const placeOrderFn = useServerFn(placeOrder);
  const createRzpFn = useServerFn(createRazorpayOrder);
  const verifyRzpFn = useServerFn(verifyRazorpayPayment);

  const subtotal = total();
  const shippingBase = delivery === "drone" ? 400 : delivery === "express" ? 150 : 0;
  const shipping = coupon?.freeShipping ? 0 : shippingBase;
  const discount = coupon?.discount ?? 0;
  const tax = Math.round((subtotal - discount) * 0.18);
  const finalTotal = Math.max(0, subtotal - discount) + shipping + tax;

  useEffect(() => {
    if (!userId) return;
    listAddrs().then((rows) => {
      setAddresses(rows);
      const def = rows.find((r) => r.is_default) ?? rows[0];
      if (def) setSelectedAddr(def.id);
    });
  }, [userId, listAddrs]);

  if (!loading && !userId) {
    return (
      <div className="px-6 max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold">Sign in to checkout</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  if (items.length === 0 && !done) {
    return (
      <div className="px-6 max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <Link to="/shop" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Browse catalog
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="px-6 max-w-2xl mx-auto py-16 text-center relative">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="size-24 mx-auto rounded-full bg-aurora animate-pulse-glow grid place-items-center mb-8 shadow-glow-cyan"
        >
          <Check className="size-12 text-background" strokeWidth={3} />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          Order <span className="text-gradient">confirmed</span>
        </h1>
        <p className="mt-4 text-muted-foreground font-mono text-sm">
          #{done.id.slice(0, 8)} · {formatPrice(done.total)}
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/orders/$id" params={{ id: done.id }} className="px-6 py-3 rounded-full bg-aurora text-background font-bold shadow-glow-cyan">
            View order
          </Link>
          <Link to="/dashboard" className="px-6 py-3 rounded-full glass font-bold">
            My orders
          </Link>
        </div>
      </div>
    );
  }

  async function applyCoupon() {
    setCouponError(null);
    if (!couponInput.trim()) {
      setCouponError("Enter a code");
      return;
    }
    try {
      const res = await validateCouponFn({ data: { code: couponInput, subtotal } });
      if (!res.ok) {
        setCouponError(res.reason);
        toast.error(res.reason);
        return;
      }
      setCoupon({ code: res.code, discount: res.discount, freeShipping: res.freeShipping });
      toast.success(`Coupon ${res.code} applied`);
    } catch (e: any) {
      const msg = e?.message ?? "Couldn't apply coupon";
      setCouponError(msg);
      toast.error(msg);
    }
  }

  async function submitOrder() {
    if (!selectedAddr) {
      toast.error("Add a shipping address");
      setStep(0);
      return;
    }
    setPlacing(true);
    try {
      // Note: items use product_id from the catalog where available so the
      // server can re-fetch true price and reserve stock atomically.
      const cartItems = items.map((i) => ({
        product_id: (i.product as any).id?.length === 36 ? (i.product as any).id : null,
        title: i.product.name,
        image: i.product.image,
        unit_price: i.product.price,
        qty: i.qty,
      }));

      const placed = await placeOrderFn({
        data: {
          items: cartItems,
          address_id: selectedAddr,
          shipping: shippingBase,
          coupon_code: coupon?.code ?? null,
          payment_method: paymentMethod,
        },
      });

      if (paymentMethod === "cod") {
        clear();
        setDone(placed);
        return;
      }

      // Razorpay flow: create RZP order on server, then open Checkout.
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Could not load payment gateway");
      const rzp = await createRzpFn({ data: { order_id: placed.id } });

      await new Promise<void>((resolve, reject) => {
        const checkout = new (window as any).Razorpay({
          key: rzp.key_id,
          amount: rzp.amount,
          currency: rzp.currency,
          order_id: rzp.razorpay_order_id,
          name: "Neural",
          description: `Order #${placed.id.slice(0, 8)}`,
          handler: async (resp: any) => {
            try {
              await verifyRzpFn({
                data: {
                  order_id: placed.id,
                  razorpay_order_id: resp.razorpay_order_id,
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              clear();
              setDone(placed);
              resolve();
            } catch (e: any) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
          theme: { color: "#06b6d4" },
        });
        checkout.on("payment.failed", (resp: any) => {
          reject(new Error(resp?.error?.description ?? "Payment failed"));
        });
        checkout.open();
      });
    } catch (e: any) {
      toast.error(e.message ?? "Order failed");
    } finally {
      setPlacing(false);
    }
  }


  return (
    <div className="px-4 sm:px-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">Checkout</p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">Almost there.</h1>
      </div>

      <div className="glass-strong rounded-2xl p-4 mb-8 flex items-center justify-between">
        {steps.map((s, i) => {
          const active = step === i;
          const complete = step > i;
          return (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                className={`size-10 grid place-items-center rounded-full shrink-0 ${
                  complete ? "bg-aurora text-background" : active ? "glass-strong text-cyan ring-2 ring-cyan shadow-glow-cyan" : "glass text-muted-foreground"
                }`}
              >
                {complete ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </motion.div>
              <span className={`hidden sm:block text-sm font-semibold ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-white/10 relative">
                  <motion.div initial={{ width: "0%" }} animate={{ width: complete ? "100%" : "0%" }} className="absolute inset-y-0 left-0 bg-aurora" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
        <div className="glass-strong rounded-3xl p-4 sm:p-6 md:p-8 min-h-[420px]">

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div id="address-list" key="address" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Shipping address</h2>
                  <button onClick={() => setShowAddrForm((v) => !v)} className="text-xs flex items-center gap-1 text-cyan">
                    <Plus className="size-3.5" /> {showAddrForm ? "Cancel" : "Add new"}
                  </button>
                </div>

                {addresses.map((a) => (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAddr(a.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedAddr(a.id); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all flex items-start gap-3 cursor-pointer ${
                      selectedAddr === a.id ? "glass-strong ring-2 ring-cyan shadow-glow-cyan" : "glass hover:glass-strong"
                    }`}
                  >
                    <MapPin className="size-4 text-cyan mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">
                        {a.recipient} {a.is_default && <span className="ml-2 text-[10px] text-cyan font-mono">DEFAULT</span>}
                      </p>
                      <p className="text-sm text-muted-foreground break-words">
                        {a.line1}, {a.city}, {a.state} {a.postal_code}, {a.country}
                      </p>
                      {a.phone && <p className="text-xs text-muted-foreground">{a.phone}</p>}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        delAddrFn({ data: { id: a.id } }).then(() => {
                          setAddresses((p) => p.filter((x) => x.id !== a.id));
                          if (selectedAddr === a.id) setSelectedAddr(null);
                        });
                      }}
                      className="text-muted-foreground hover:text-rose-400 p-1 shrink-0"
                      aria-label="Delete address"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}


                {(addresses.length === 0 || showAddrForm) && (
                  <AddressForm
                    onSave={async (d) => {
                      const row = await saveAddrFn({ data: d });
                      const list = await listAddrs();
                      setAddresses(list);
                      setSelectedAddr(row.id);
                      setShowAddrForm(false);
                    }}
                  />
                )}
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="delivery" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3">
                <h2 className="text-xl font-bold mb-2">Delivery method</h2>
                {[
                  { id: "standard", label: "Standard", desc: "3–5 days", price: 0 },
                  { id: "express", label: "Express", desc: "Next day", price: 150 },
                  { id: "drone", label: "Autonomous drone", desc: "2 hours", price: 400 },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDelivery(d.id as any)}
                    className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${
                      delivery === d.id ? "glass-strong ring-2 ring-cyan shadow-glow-cyan" : "glass hover:glass-strong"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{d.label}</p>
                      <p className="text-sm text-muted-foreground">{d.desc}</p>
                    </div>
                    <p className="font-mono font-bold">{d.price === 0 ? "Free" : formatPrice(d.price)}</p>
                  </button>
                ))}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h2 className="text-xl font-bold mb-2">Payment</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={`text-left p-4 rounded-2xl transition-all ${
                      paymentMethod === "razorpay" ? "glass-strong ring-2 ring-cyan shadow-glow-cyan" : "glass hover:glass-strong"
                    }`}
                  >
                    <p className="font-bold">Card · UPI · Wallet · Netbanking</p>
                    <p className="text-xs text-muted-foreground mt-1">Secure payment via Razorpay</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`text-left p-4 rounded-2xl transition-all ${
                      paymentMethod === "cod" ? "glass-strong ring-2 ring-cyan shadow-glow-cyan" : "glass hover:glass-strong"
                    }`}
                  >
                    <p className="font-bold">Cash on delivery</p>
                    <p className="text-xs text-muted-foreground mt-1">Pay when your order arrives</p>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {paymentMethod === "razorpay"
                    ? "You'll be redirected to a secure payment window after placing the order."
                    : "We'll confirm your order; pay the courier in cash on delivery."}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (step === 0 && !selectedAddr) {
                  toast.error("Select a shipping address");
                  document.getElementById("address-list")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  return;
                }
                if (step < 2) setStep(step + 1);
                else submitOrder();
              }}
              disabled={placing || (step === 0 && !selectedAddr)}
              aria-disabled={placing || (step === 0 && !selectedAddr)}
              title={step === 0 && !selectedAddr ? "Select an address to continue" : undefined}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-aurora animate-aurora font-bold text-background shadow-glow-cyan hover:scale-[1.02] active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {step === 2 ? (placing ? "Placing…" : "Place order") : "Continue"}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <aside className="glass-strong rounded-3xl p-4 sm:p-6 h-fit lg:sticky lg:top-24">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">Order summary</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <div key={i.product.id} className="flex gap-3 items-center">
                <div className="size-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img referrerPolicy="no-referrer" src={i.product.image} alt="" className="size-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{i.product.name}</p>
                  <p className="text-xs text-muted-foreground">×{i.qty}</p>
                </div>
                <p className="text-sm font-mono">{formatPrice(i.product.price * i.qty)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex gap-2">
              <input
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="flex-1 h-10 rounded-xl bg-glass border border-white/10 px-3 text-sm font-mono"
              />
            <button
              onClick={applyCoupon}
              aria-describedby={couponError ? "coupon-error" : undefined}
              className="h-10 px-4 rounded-xl glass-strong text-sm font-bold flex items-center gap-1"
            >
                <Tag className="size-3.5" /> Apply
              </button>
            </div>
            {couponError && (
              <p id="coupon-error" role="alert" className="text-xs mt-2 text-rose-400">
                {couponError}
              </p>
            )}
            {coupon && (
              <p className="text-xs mt-2 text-cyan flex items-center justify-between">
                <span>{coupon.code} active</span>
                <button onClick={() => { setCoupon(null); setCouponError(null); }} className="text-muted-foreground hover:text-rose-400">Remove</button>
              </p>
            )}
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">Try: WELCOME10 · NEURAL50 · FREESHIP · FLASH25</p>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            {discount > 0 && <Row label="Discount" value={`− ${formatPrice(discount)}`} />}
            <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
            <Row label="GST (18%)" value={formatPrice(tax)} muted />
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="font-bold">Total</span>
            <motion.span key={finalTotal} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-mono font-extrabold text-gradient">
              {formatPrice(finalTotal)}
            </motion.span>
          </div>
          <div className="mt-4 glass rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-purple shrink-0" />
            Secure encrypted checkout · 7-day returns
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

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</Label>
      <Input {...props} className="bg-glass border-white/10 h-12 rounded-xl focus-visible:ring-cyan focus-visible:ring-2" />
    </div>
  );
}

function AddressForm({ onSave }: { onSave: (d: any) => Promise<void> }) {
  const [d, setD] = useState({
    recipient: "",
    phone: "",
    line1: "",
    city: "",
    state: "",
    postal_code: "",
    country: "IN",
    is_default: true,
  });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const set = (k: string, v: any) => setD((p) => ({ ...p, [k]: v }));

  async function useMyLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported on this device");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10_000 })
      );
      const { latitude, longitude } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error("Lookup failed");
      const j = await res.json();
      const a = j.address ?? {};
      const line1 = [a.house_number, a.road || a.pedestrian || a.neighbourhood].filter(Boolean).join(" ") || j.display_name?.split(",").slice(0, 2).join(",") || "";
      setD((p) => ({
        ...p,
        line1: line1 || p.line1,
        city: a.city || a.town || a.village || a.suburb || p.city,
        state: a.state || p.state,
        postal_code: a.postcode || p.postal_code,
        country: (a.country_code || "in").toUpperCase(),
      }));
      toast.success("Address filled from your location — verify before saving");
    } catch (err: any) {
      toast.error(err?.code === 1 ? "Location permission denied" : "Couldn't get your location");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-4 mt-3 space-y-3">
      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="w-full h-10 rounded-xl glass-strong hover:bg-cyan/10 text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
      >
        <span aria-hidden>📍</span>
        {locating ? "Getting your location…" : "Use my current location"}
      </button>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Full name" value={d.recipient} onChange={(e) => set("recipient", e.target.value)} />
        <Field label="Phone" value={d.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <Field label="Address line" value={d.line1} onChange={(e) => set("line1", e.target.value)} />
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="City" value={d.city} onChange={(e) => set("city", e.target.value)} />
        <Field label="State" value={d.state} onChange={(e) => set("state", e.target.value)} />
        <Field label="Pincode" value={d.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
      </div>
      <button
        disabled={saving}
        onClick={async () => {
          if (!d.recipient || !d.line1 || !d.city || !d.postal_code) {
            toast.error("Fill required fields");
            return;
          }
          setSaving(true);
          try {
            await onSave(d);
            toast.success("Address saved");
          } catch (e: any) {
            toast.error(e.message ?? "Failed");
          } finally {
            setSaving(false);
          }
        }}
        className="w-full h-11 rounded-xl bg-aurora text-background font-bold disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save address"}
      </button>
    </div>
  );
}
