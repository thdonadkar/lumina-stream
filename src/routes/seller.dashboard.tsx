import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Package, ShoppingBag, DollarSign, TrendingUp, Plus, BarChart3,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { products } from "@/lib/products";

export const Route = createFileRoute("/seller/dashboard")({
  head: () => ({ meta: [{ title: "Seller — Neural" }] }),
  component: () => (
    <RoleGate role="seller">
      <SellerDashboard />
    </RoleGate>
  ),
});

function SellerDashboard() {
  // mock seller stats
  const mine = products.slice(0, 4);
  const stats = [
    { label: "Revenue (30d)", value: "$48,210", delta: "+18.4%", icon: DollarSign, accent: "cyan" },
    { label: "Orders", value: "238", delta: "+12.1%", icon: ShoppingBag, accent: "purple" },
    { label: "Active products", value: String(mine.length), delta: "+2", icon: Package, accent: "rose" },
    { label: "Conversion", value: "3.42%", delta: "+0.4%", icon: TrendingUp, accent: "cyan" },
  ];

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan font-mono">Seller console</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/seller/products" className="glass rounded-full px-4 py-2 text-sm font-medium hover:glass-strong">
            My products
          </Link>
          <Link
            to="/seller/add-product"
            className="rounded-full px-4 py-2 text-sm font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-2"
          >
            <Plus className="size-4" /> New product
          </Link>
        </div>
      </header>

      {/* stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {stats.map((s, i) => {
          const I = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 relative overflow-hidden"
            >
              <div className={`absolute -top-8 -right-8 size-24 rounded-full bg-${s.accent}/20 blur-2xl`} />
              <I className="size-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-3">{s.label}</p>
              <p className="text-2xl font-extrabold tracking-tighter mt-1">{s.value}</p>
              <p className="text-[11px] text-cyan font-mono mt-1">{s.delta}</p>
            </motion.div>
          );
        })}
      </div>

      {/* chart placeholder + top products */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold tracking-tight">Sales — last 14 days</h3>
            <BarChart3 className="size-4 text-muted-foreground" />
          </div>
          <Sparkbars data={[12, 19, 16, 22, 28, 24, 31, 27, 34, 30, 41, 38, 47, 52]} />
        </div>

        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-bold tracking-tight mb-4">Top products</h3>
          <ul className="space-y-3">
            {mine.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}</span>
                <img src={p.image} alt="" className="size-10 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">${p.price.toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SellerNav />
    </div>
  );
}

function Sparkbars({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((v, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 rounded-md bg-aurora animate-aurora"
        />
      ))}
    </div>
  );
}

export function SellerNav() {
  const links = [
    { to: "/seller/dashboard", label: "Overview" },
    { to: "/seller/products", label: "Products" },
    { to: "/seller/add-product", label: "Add product" },
    { to: "/seller/orders", label: "Orders" },
    { to: "/seller/analytics", label: "Analytics" },
  ];
  return (
    <nav className="mt-10 glass rounded-2xl p-2 flex flex-wrap gap-1">
      {links.map((l) => (
        <Link
          key={l.to}
          to={l.to}
          activeProps={{ className: "bg-aurora animate-aurora text-background" }}
          inactiveProps={{ className: "hover:bg-white/5 text-muted-foreground" }}
          className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
