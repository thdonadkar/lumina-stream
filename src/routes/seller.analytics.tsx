import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";

export const Route = createFileRoute("/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const points = Array.from({ length: 30 }, (_, i) => 30 + Math.sin(i / 3) * 18 + Math.random() * 10);
  const max = Math.max(...points);

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Analytics</h1>

      <div className="glass-strong rounded-3xl p-6 mb-4">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Revenue, last 30 days</h3>
        <svg viewBox="0 0 600 200" className="w-full h-48">
          <defs>
            <linearGradient id="grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(195 90% 60%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(195 90% 60%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            d={`M ${points.map((p, i) => `${(i / (points.length - 1)) * 600},${200 - (p / max) * 180}`).join(" L ")}`}
            fill="none"
            stroke="hsl(195 90% 70%)"
            strokeWidth="2"
          />
          <path
            d={`M 0,200 L ${points.map((p, i) => `${(i / (points.length - 1)) * 600},${200 - (p / max) * 180}`).join(" L ")} L 600,200 Z`}
            fill="url(#grad)"
          />
        </svg>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Avg order value", value: "$203" },
          { label: "Refund rate", value: "1.2%" },
          { label: "Repeat customers", value: "38%" },
        ].map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold tracking-tighter mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <SellerNav />
    </div>
  );
}
