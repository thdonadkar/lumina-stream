import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { ChartShell, ChartTooltip } from "@/components/charts/ChartShell";
import { listSellerOrders } from "@/lib/orders.functions";
import { listMyProducts } from "@/lib/products.functions";

export const Route = createFileRoute("/seller/analytics")({
  ssr: false,
  beforeLoad: () => requireRole("seller"),
  head: () => ({ meta: [{ title: "Analytics — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

type Order = { id: string; total: number | string; status: string; created_at: string; order_items?: any[] };

function Page() {
  const listOrders = useServerFn(listSellerOrders);
  const listProds = useServerFn(listMyProducts);

  const { data: orders = [] } = useQuery({ queryKey: ["seller-orders"], queryFn: () => listOrders() });
  const { data: prods = [] } = useQuery({ queryKey: ["my-products"], queryFn: () => listProds() });

  const stats = useMemo(() => {
    const list = orders as Order[];
    const revenue = list.reduce((s, o) => s + Number(o.total), 0);
    const count = list.length;
    const aov = count ? Math.round(revenue / count) : 0;
    const delivered = list.filter((o) => o.status === "delivered").length;
    const returned = list.filter((o) => o.status === "returned" || o.status === "return_requested").length;
    const refundRate = count ? ((returned / count) * 100).toFixed(1) : "0.0";
    const fulfilRate = count ? ((delivered / count) * 100).toFixed(1) : "0.0";
    return { revenue, count, aov, refundRate, fulfilRate };
  }, [orders]);

  // Revenue per day (last 30 days)
  const series = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {};
    const order: string[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = { date: key.slice(5), revenue: 0, orders: 0 };
      order.push(key);
    }
    for (const o of orders as Order[]) {
      const key = new Date(o.created_at).toISOString().slice(0, 10);
      if (map[key]) {
        map[key].revenue += Number(o.total);
        map[key].orders += 1;
      }
    }
    return order.map((k) => map[k]);
  }, [orders]);

  // Top products: aggregate units from order_items
  const top = useMemo(() => {
    const tally: Record<string, { name: string; units: number }> = {};
    for (const o of orders as Order[]) {
      for (const it of o.order_items ?? []) {
        const name = it.title ?? "Unknown";
        const e = (tally[name] ||= { name, units: 0 });
        e.units += Number(it.qty ?? 0);
      }
    }
    return Object.values(tally).sort((a, b) => b.units - a.units).slice(0, 5);
  }, [orders]);

  const kpis = [
    { label: "Total revenue", value: `₹${stats.revenue.toLocaleString("en-IN")}` },
    { label: "Total orders", value: String(stats.count) },
    { label: "Avg order value", value: `₹${stats.aov.toLocaleString("en-IN")}` },
    { label: "Products", value: String((prods as any[]).length) },
    { label: "Fulfillment rate", value: `${stats.fulfilRate}%` },
    { label: "Return rate", value: `${stats.refundRate}%` },
  ];

  return (
    <div className="px-4 pt-28 pb-24 max-w-7xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-cyan font-mono">Seller console</p>
        <h1 className="text-4xl font-extrabold tracking-tighter">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Live data from your orders & catalog.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
        {kpis.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 size-20 rounded-full bg-cyan/20 blur-2xl" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-extrabold tracking-tighter mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <ChartShell title="Revenue over time" subtitle="Last 30 days" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ left: -10, right: 8, top: 8 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
              <YAxis stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "oklch(0.85 0.17 200 / 0.4)" }} />
              <Line type="monotone" dataKey="revenue" stroke="oklch(0.85 0.17 200)" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="orders" stroke="oklch(0.7 0.22 300)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartShell>

        <ChartShell title="Top products" subtitle="Units sold">
          {top.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No sales yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={top} layout="vertical" margin={{ left: 24, right: 16, top: 8 }}>
                <CartesianGrid stroke="oklch(1 0 0 / 0.06)" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.65 0.02 270)" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.85 0.005 270)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
                <Bar dataKey="units" radius={[0, 6, 6, 0]}>
                  {top.map((_, i) => <Cell key={i} fill={`oklch(${0.72 + i * 0.02} 0.2 ${200 + i * 22})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartShell>
      </div>

      <SellerNav />
    </div>
  );
}
