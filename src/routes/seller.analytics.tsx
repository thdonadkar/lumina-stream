import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { ChartShell, ChartTooltip } from "@/components/charts/ChartShell";
import { RangeFilter } from "@/components/charts/RangeFilter";
import {
  RANGES, categoryDistribution, revenueSeries, topProductsBar, totals,
  type Range,
} from "@/lib/analytics-mock";

export const Route = createFileRoute("/seller/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const [range, setRange] = useState<Range>("30d");
  const days = RANGES.find((r) => r.id === range)!.days;
  const series = useMemo(
    () => revenueSeries(days).map((p) => ({ ...p, revenue: Math.round(p.revenue * 0.12), orders: Math.round(p.orders * 0.12), users: Math.round(p.users * 0.12) })),
    [days],
  );
  const t = useMemo(() => totals(series), [series]);
  const top = useMemo(() => topProductsBar().slice(0, 5).map((p) => ({ ...p, units: Math.round(p.units * 0.6) })), []);
  const cats = useMemo(() => categoryDistribution().slice(0, 4), []);

  const stats = [
    { label: "Avg order value", value: `₹${t.aov}` },
    { label: "Refund rate", value: "1.2%" },
    { label: "Repeat customers", value: "38%" },
    { label: "Cart abandonment", value: "24%" },
  ];

  return (
    <div className="px-4 pt-28 pb-24 max-w-7xl mx-auto">
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-cyan font-mono">Seller console</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">Analytics</h1>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 size-20 rounded-full bg-cyan/20 blur-2xl" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold tracking-tighter mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartShell title="Sales over time" subtitle={`Revenue · last ${days} days`} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.ceil(days / 8)} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.85 0.17 200 / 0.4)" }} />
              <Line type="monotone" dataKey="revenue" stroke="oklch(0.85 0.17 200)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: "oklch(0.85 0.17 200)" }} />
              <Line type="monotone" dataKey="orders" stroke="oklch(0.7 0.22 300)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Category mix" subtitle="Your catalog">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Tooltip content={<ChartTooltip />} />
              <Pie data={cats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} stroke="oklch(0.13 0.02 270)" strokeWidth={2}>
                {cats.map((c) => <Cell key={c.name} fill={c.color} />)}
              </Pie>
              <Legend iconType="circle" wrapperStyle={{ fontSize: 10, paddingTop: 12 }} formatter={(v) => <span className="text-muted-foreground">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartShell>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartShell title="Product performance" subtitle="Units sold">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={top} layout="vertical" margin={{ left: 24, right: 16, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
              <XAxis type="number" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.85 0.005 270)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={130} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Bar dataKey="units" radius={[0, 6, 6, 0]}>
                {top.map((_, i) => <Cell key={i} fill={`oklch(${0.72 + i * 0.02} 0.2 ${200 + i * 22})`} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Conversion funnel" subtitle="Last 30 days">
          <div className="space-y-3 py-2">
            {[
              { label: "Sessions", value: 12480, pct: 100 },
              { label: "Product views", value: 5820, pct: 47 },
              { label: "Add to cart", value: 1340, pct: 11 },
              { label: "Checkout started", value: 612, pct: 4.9 },
              { label: "Purchased", value: 428, pct: 3.4 },
            ].map((f, i) => (
              <div key={f.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{f.label}</span>
                  <span className="font-mono">{f.value.toLocaleString()} · {f.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-aurora animate-aurora"
                    style={{ width: `${f.pct}%`, transition: "width 600ms cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${i * 80}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartShell>
      </div>

      <SellerNav />
    </div>
  );
}
