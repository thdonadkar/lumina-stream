import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Package, ShoppingBag, DollarSign, TrendingUp, Plus, ArrowUpRight, Star,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip,
  XAxis, YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { products } from "@/lib/products";
import { listSellerOrders } from "@/lib/orders.functions";
import { ChartShell, ChartTooltip } from "@/components/charts/ChartShell";
import { RangeFilter } from "@/components/charts/RangeFilter";
import { RANGES, revenueSeries, totals, type Range } from "@/lib/analytics-mock";

export const Route = createFileRoute("/seller/dashboard")({
  ssr: false,
  beforeLoad: () => requireRole("seller"),
  head: () => ({ meta: [{ title: "Seller — AtomSpot" }] }),
  component: () => (
    <RoleGate role="seller">
      <SellerDashboard />
    </RoleGate>
  ),
});

function SellerDashboard() {
  const [range, setRange] = useState<Range>("30d");
  const days = RANGES.find((r) => r.id === range)!.days;
  // seller has ~12% of platform-wide series
  const series = useMemo(
    () => revenueSeries(days).map((p) => ({ ...p, revenue: Math.round(p.revenue * 0.12), orders: Math.round(p.orders * 0.12) })),
    [days],
  );
  const t = useMemo(() => totals(series), [series]);
  const mine = products.slice(0, 4);

  const stats = [
    { label: "Revenue", value: `₹${t.revenue.toLocaleString()}`, delta: "+18.4%", icon: DollarSign },
    { label: "Orders", value: t.orders.toLocaleString(), delta: "+12.1%", icon: ShoppingBag },
    { label: "Active products", value: String(mine.length), delta: "+2", icon: Package },
    { label: "Conversion", value: "3.42%", delta: "+0.4pt", icon: TrendingUp },
  ];

  const listOrders = useServerFn(listSellerOrders);
  const { data: orders = [] } = useQuery({
    queryKey: ["seller-orders"],
    queryFn: () => listOrders(),
  });
  const recentOrders = (orders as any[]).slice(0, 5).map((o) => ({
    id: `ORD-${o.id.slice(0, 6).toUpperCase()}`,
    customer: o.user_id?.slice(0, 8) ?? "—",
    item: o.order_items?.[0]?.title ?? `${o.order_items?.length ?? 0} items`,
    total: Number(o.total),
    status: o.status,
  }));

  return (
    <div className="px-4 pt-28 pb-24 max-w-7xl mx-auto">
      <header className="flex items-end justify-between mb-8 gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan font-mono">Seller console</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Track sales, orders and product performance.</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <RangeFilter value={range} onChange={setRange} />
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
              <div className="absolute -top-8 -right-8 size-24 rounded-full bg-aurora opacity-20 blur-2xl" />
              <div className="flex items-center justify-between">
                <I className="size-4 text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase text-cyan flex items-center gap-0.5">
                  <ArrowUpRight className="size-3" /> {s.delta}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{s.label}</p>
              <p className="text-2xl font-extrabold tracking-tighter mt-1">{s.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartShell title="Revenue trend" subtitle={`Last ${days} days`} className="lg:col-span-2" delay={0.05}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="srev" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.22 300)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.7 0.22 300)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.7 0.22 300 / 0.4)" }} />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.7 0.22 300)" strokeWidth={2} fill="url(#srev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Top products" subtitle="By revenue" delay={0.1}>
          <ul className="space-y-3">
            {mine.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center gap-3"
              >
                <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}</span>
                <img referrerPolicy="no-referrer" src={p.image} alt="" className="size-10 rounded-lg object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Star className="size-3 fill-cyan text-cyan" /> {p.rating} · ${p.price.toLocaleString()}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </ChartShell>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartShell title="Orders per day" subtitle={`Last ${days} days`} delay={0.15}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="orders" fill="oklch(0.85 0.17 200)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Recent orders" subtitle="Latest 5" delay={0.2} right={
          <Link to="/seller/orders" className="text-[11px] font-mono text-cyan flex items-center gap-1 hover:underline">
            View all <ArrowUpRight className="size-3" />
          </Link>
        }>
          <ul className="divide-y divide-white/5">
            {recentOrders.map((o) => (
              <li key={o.id} className="py-2 flex items-center gap-3 text-sm">
                <span className="font-mono text-[11px] text-muted-foreground w-20">{o.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{o.item}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{o.customer}</p>
                </div>
                <span className="font-mono">${o.total.toLocaleString()}</span>
                <span className="px-2 py-0.5 rounded-full glass text-[10px] uppercase font-mono">{o.status}</span>
              </li>
            ))}
          </ul>
        </ChartShell>
      </div>

      <SellerNav />
    </div>
  );
}

export function SellerNav() {
  const links = [
    { to: "/seller/dashboard", label: "Overview" },
    { to: "/seller/products", label: "Products" },
    { to: "/seller/add-product", label: "Add product" },
    { to: "/seller/orders", label: "Orders" },
    { to: "/seller/support", label: "Support" },
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
