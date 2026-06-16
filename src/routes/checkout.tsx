import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, CreditCard, MapPin, Truck, Sparkles } from "lucide-react";
import { useCart, formatPrice } from "@/lib/cart-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Neural" }] }),
  component: Checkout,
});

const steps = [
  { id: 0, label: "Address", icon: MapPin },
  { id: 1, label: "Delivery", icon: Truck },
  { id: 2, label: "Payment", icon: CreditCard },
];

function Checkout() {
  const { items, total, clear } = useCart();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [delivery, setDelivery] = useState<"standard" | "express" | "drone">("express");

  const subtotal = total();
  const shipping = delivery === "drone" ? 40 : delivery === "express" ? 15 : 0;
  const finalTotal = subtotal + shipping;

  if (items.length === 0 && !done) {
    return (
      <div className="px-6 max-w-2xl mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <p className="text-muted-foreground mt-2">Add hardware before checking out.</p>
        <Link
          to="/shop"
          className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold"
        >
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
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-extrabold tracking-tighter"
        >
          Transmission <span className="text-gradient bg-aurora">complete</span>
        </motion.h1>
        <p className="mt-4 text-muted-foreground">
          Your order is preparing for departure. We've sent confirmation to your inbox.
        </p>

        {/* Confetti */}
        <div className="fixed inset-0 pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ x: "50vw", y: "30vh", opacity: 1 }}
              animate={{
                x: `${Math.random() * 100}vw`,
                y: `${50 + Math.random() * 50}vh`,
                opacity: 0,
                rotate: Math.random() * 720,
              }}
              transition={{ duration: 2 + Math.random() * 2, ease: "easeOut" }}
              className="absolute size-2 rounded-sm bg-aurora"
              style={{ backgroundColor: ["#22d3ee", "#a855f7", "#f43f5e"][i % 3] }}
            />
          ))}
        </div>

        <Link
          to="/dashboard"
          className="mt-8 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold shadow-glow-cyan"
        >
          View order
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Checkout
        </p>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tighter">
          Almost there.
        </h1>
      </div>

      {/* Stepper */}
      <div className="glass-strong rounded-2xl p-4 mb-8 flex items-center justify-between">
        {steps.map((s, i) => {
          const active = step === i;
          const complete = step > i;
          return (
            <div key={s.id} className="flex items-center gap-3 flex-1">
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                className={`size-10 grid place-items-center rounded-full shrink-0 ${
                  complete
                    ? "bg-aurora text-background"
                    : active
                    ? "glass-strong text-cyan ring-2 ring-cyan shadow-glow-cyan"
                    : "glass text-muted-foreground"
                }`}
              >
                {complete ? <Check className="size-4" /> : <s.icon className="size-4" />}
              </motion.div>
              <span
                className={`hidden sm:block text-sm font-semibold ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className="flex-1 h-px bg-white/10 relative">
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: complete ? "100%" : "0%" }}
                    className="absolute inset-y-0 left-0 bg-aurora"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="glass-strong rounded-3xl p-6 md:p-8 min-h-[420px]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="address"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold mb-2">Shipping address</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Full name" placeholder="Aria Kim" />
                  <Field label="Email" placeholder="aria@neural.io" type="email" />
                </div>
                <Field label="Address line 1" placeholder="1 Orbital Way" />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="City" placeholder="Tokyo" />
                  <Field label="Region" placeholder="Shibuya" />
                  <Field label="Postal" placeholder="150-0001" />
                </div>
              </motion.div>
            )}
            {step === 1 && (
              <motion.div
                key="delivery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <h2 className="text-xl font-bold mb-2">Delivery method</h2>
                {[
                  { id: "standard", label: "Standard", desc: "3–5 days", price: 0 },
                  { id: "express", label: "Express", desc: "Next day", price: 15 },
                  { id: "drone", label: "Autonomous drone", desc: "2 hours", price: 40 },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDelivery(d.id as any)}
                    className={`w-full text-left p-4 rounded-2xl flex items-center justify-between transition-all ${
                      delivery === d.id
                        ? "glass-strong ring-2 ring-cyan shadow-glow-cyan"
                        : "glass hover:glass-strong"
                    }`}
                  >
                    <div>
                      <p className="font-bold">{d.label}</p>
                      <p className="text-sm text-muted-foreground">{d.desc}</p>
                    </div>
                    <p className="font-mono font-bold">
                      {d.price === 0 ? "Free" : formatPrice(d.price)}
                    </p>
                  </button>
                ))}
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-xl font-bold mb-2">Payment</h2>
                <div className="flex gap-2 flex-wrap">
                  {["Card", "Apple Pay", "Google Pay", "Crypto"].map((m) => (
                    <button
                      key={m}
                      className="px-4 py-2 rounded-full glass hover:glass-strong text-sm font-medium"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <Field label="Card number" placeholder="4242 4242 4242 4242" />
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Expiry" placeholder="12/27" />
                  <Field label="CVC" placeholder="123" />
                  <Field label="ZIP" placeholder="150-0001" />
                </div>
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
                if (step < 2) setStep(step + 1);
                else {
                  setDone(true);
                  clear();
                }
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-aurora animate-aurora font-bold text-background shadow-glow-cyan hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {step === 2 ? "Place order" : "Continue"}
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Summary */}
        <aside className="glass-strong rounded-3xl p-6 h-fit sticky top-24">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-4">
            Order summary
          </p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((i) => (
              <div key={i.product.id} className="flex gap-3 items-center">
                <div className="size-12 rounded-lg bg-secondary overflow-hidden shrink-0">
                  <img src={i.product.image} alt="" className="size-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{i.product.name}</p>
                  <p className="text-xs text-muted-foreground">×{i.qty}</p>
                </div>
                <p className="text-sm font-mono">{formatPrice(i.product.price * i.qty)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
            <Row label="Tax" value="Calculated next" muted />
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="font-bold">Total</span>
            <motion.span
              key={finalTotal}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl font-mono font-extrabold text-gradient bg-aurora"
            >
              {formatPrice(finalTotal)}
            </motion.span>
          </div>
          <div className="mt-4 glass rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-purple shrink-0" />
            Add Echo Implants & save 8% bundle credit
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
      <Label className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5 block">
        {label}
      </Label>
      <Input
        {...props}
        className="bg-glass border-white/10 h-12 rounded-xl focus-visible:ring-cyan focus-visible:ring-2"
      />
    </div>
  );
}
