import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Store, Package, ShoppingBag, TrendingUp, ShieldAlert,
  ShoppingCart, UserPlus, BadgeCheck, Activity, ArrowUpRight,
  Megaphone, Undo2, LifeBuoy, FolderTree,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { RoleGate } from "@/components/RoleGate";
import { ChartShell, ChartTooltip } from "@/components/charts/ChartShell";
import { RangeFilter } from "@/components/charts/RangeFilter";
import {
  RANGES, activityFeed, categoryDistribution, revenueSeries, topProductsBar, totals,
  type Range,
} from "@/lib/analytics-mock";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin — Neural" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const [range, setRange] = useState<Range>("30d");
  const days = RANGES.find((r) => r.id === range)!.days;
  const series = useMemo(() => revenueSeries(days), [days]);
  const t = useMemo(() => totals(series), [series]);
  const cats = useMemo(() => categoryDistribution(), []);
  const top = useMemo(() => topProductsBar(), []);
  const feed = useMemo(() => activityFeed(), []);

  const kpis = [
    { label: "Total revenue", value: `₹${t.revenue.toLocaleString("en-IN")}`, delta: "+18.4%", icon: TrendingUp, glow: "bg-cyan/30", text: "text-cyan", ring: "ring-cyan/30" },
    { label: "Total orders", value: t.orders.toLocaleString(), delta: "+12.1%", icon: ShoppingBag, glow: "bg-purple-500/30", text: "text-purple-400", ring: "ring-purple-500/30" },
    { label: "Active users", value: t.users.toLocaleString(), delta: "+8.3%", icon: Users, glow: "bg-rose-500/30", text: "text-rose-400", ring: "ring-rose-500/30" },
    { label: "Total sellers", value: "238", delta: "+6 new", icon: Store, glow: "bg-cyan/30", text: "text-cyan", ring: "ring-cyan/30" },
    { label: "Conversion rate", value: "3.42%", delta: "+0.4pt", icon: Activity, glow: "bg-purple-500/30", text: "text-purple-400", ring: "ring-purple-500/30" },
  ];

  return (
    <div className="px-4 pt-28 pb-24 max-w-7xl mx-auto">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-rose-400 font-mono flex items-center gap-2">
            <ShieldAlert className="size-3" /> Admin control center
          </p>
          <h1 className="text-4xl font-extrabold tracking-tighter mt-1">Operations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time view across revenue, orders, users and seller activity.
          </p>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {kpis.map((k, i) => {
          const I = k.icon;
          return (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass rounded-2xl p-5 relative overflow-hidden group"
            >
              <div className={`absolute -top-10 -right-10 size-28 rounded-full ${k.glow} blur-3xl opacity-50 group-hover:opacity-80 transition-opacity`} />
              <div className="flex items-center justify-between">
                <I className="size-4 text-muted-foreground" />
                <span className="text-[10px] font-mono uppercase text-cyan flex items-center gap-0.5">
                  <ArrowUpRight className="size-3" />
                  {k.delta}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{k.label}</p>
              <p className="text-2xl font-extrabold tracking-tighter mt-1">{k.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue area + Pie */}
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartShell title="Revenue over time" subtitle={`Last ${days} days`} className="lg:col-span-2" delay={0.05}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="rev" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.85 0.17 200)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.85 0.17 200)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.85 0.17 200 / 0.4)" }} />
              <Area type="monotone" dataKey="revenue" stroke="oklch(0.85 0.17 200)" strokeWidth={2} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Category distribution" subtitle="Units sold" delay={0.1}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie data={cats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} stroke="oklch(0.13 0.02 270)" strokeWidth={2}>
                {cats.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 10, paddingTop: 12 }}
                formatter={(v) => <span className="text-muted-foreground">{v}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* Orders bar + user growth area */}
      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        <ChartShell title="Orders per day" subtitle={`Last ${days} days`} delay={0.15}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="orders" fill="oklch(0.7 0.22 300)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="User growth" subtitle="Daily active signups" delay={0.2}>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="usr" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.7 0.22 15)" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="oklch(0.7 0.22 15)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.7 0.22 15 / 0.4)" }} />
              <Area type="monotone" dataKey="users" stroke="oklch(0.7 0.22 15)" strokeWidth={2} fill="url(#usr)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      {/* Top products horizontal bar + Activity feed */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <ChartShell title="Top selling products" subtitle="By units" delay={0.25} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top} layout="vertical" margin={{ left: 24, right: 16, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
              <XAxis type="number" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.85 0.005 270)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="units" radius={[0, 6, 6, 0]}>
                {top.map((_, i) => (
                  <Cell key={i} fill={`oklch(${0.7 + i * 0.02} 0.2 ${200 + i * 18})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Activity feed" subtitle="Live · last 24h" delay={0.3}>
          <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {feed.map((f, i) => {
              const Icon = f.kind === "order" ? ShoppingCart : f.kind === "user" ? UserPlus : BadgeCheck;
              return (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.04 }}
                  className="flex items-start gap-3"
                >
                  <div className={`size-8 rounded-xl grid place-items-center shrink-0 ring-1 ring-${f.tone}/30 text-${f.tone}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-snug">{f.text}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{f.at}</p>
                  </div>
                  {f.amount && <span className="text-xs font-mono font-bold">{f.amount}</span>}
                </motion.li>
              );
            })}
          </ul>
        </ChartShell>
      </div>

      {/* Quick tiles + AdminNav */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {[
          { to: "/admin/banners", label: "Manage Banners", icon: Megaphone, accent: "ring-1 ring-cyan/40 bg-cyan/5" },
          { to: "/admin/products", label: "Products", icon: Package },
          { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
          { to: "/admin/returns", label: "Returns & Refunds", icon: Undo2 },
          { to: "/admin/users", label: "Users", icon: Users },
          { to: "/admin/sellers", label: "Sellers", icon: Store },
          { to: "/admin/categories", label: "Categories", icon: FolderTree },
          { to: "/admin/support", label: "Support", icon: LifeBuoy },
        ].map((q) => {
          const I = q.icon;
          return (
            <Link
              key={q.to}
              to={q.to}
              className={`glass hover:glass-strong rounded-2xl p-4 flex items-center justify-between group transition-all ${q.accent ?? ""}`}
            >
              <span className="flex items-center gap-3 text-sm font-medium">
                <I className="size-4 text-muted-foreground group-hover:text-cyan transition-colors" />
                {q.label}
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-cyan transition-colors" />
            </Link>
          );
        })}
      </div>

      <AdminNav />
    </div>
  );
}

export function AdminNav() {
  const links = [
    { to: "/admin/dashboard", label: "Overview" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/sellers", label: "Sellers" },
    { to: "/admin/products", label: "Products" },
    { to: "/admin/orders", label: "Orders" },
    { to: "/admin/returns", label: "Returns" },
    { to: "/admin/banners", label: "Banners" },
    { to: "/admin/categories", label: "Categories" },
    { to: "/admin/support", label: "Support" },
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
