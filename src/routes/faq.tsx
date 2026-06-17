import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: "FAQ — Neural" }, { name: "description", content: "Frequently asked questions." }] }),
  component: Page,
});

const FAQ = [
  { q: "How fast is shipping?", a: "Standard shipping arrives in 2–4 days. Express options are calculated at checkout based on your address." },
  { q: "What's your return policy?", a: "Free returns within 30 days on unused items. Open electronics carry a 15% restocking fee." },
  { q: "How do I become a seller?", a: "Apply from your account dashboard. Most applications are reviewed within 48 hours." },
  { q: "Are coupons stackable?", a: "One discount coupon per order. Free-shipping coupons can be combined with a discount coupon." },
  { q: "Do you ship internationally?", a: "Yes — to 40+ countries. Duties are calculated at checkout where applicable." },
  { q: "How do I cancel an order?", a: "Orders can be cancelled before they're marked Shipped from your Orders page." },
];

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <h1 className="text-5xl font-extrabold tracking-tighter mb-2">Frequently asked</h1>
      <p className="text-muted-foreground mb-8">Everything you need to know before reaching out.</p>
      <div className="space-y-2">
        {FAQ.map((f) => <Item key={f.q} {...f} />)}
      </div>
    </div>
  );
}

function Item({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <span className="font-medium">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown className="size-4" /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-5 text-sm text-muted-foreground">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
