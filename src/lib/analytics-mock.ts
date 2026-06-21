// Deterministic mock analytics data, generated client-side.
// Sliced by a time range to power the admin & seller dashboards.

export type Range = "7d" | "30d" | "90d";

export const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
];

// Seeded pseudo-random so the chart shape is stable per index.
function seeded(i: number, base = 1) {
  const x = Math.sin(i * 9301 + base * 49297) * 233280;
  return x - Math.floor(x);
}

export function revenueSeries(days: number) {
  const out = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const trend = 1 + (days - i) / (days * 1.5);
    const rev = Math.round(2400 * trend + seeded(i) * 1800 + Math.sin(i / 3) * 800);
    const orders = Math.round(rev / (90 + seeded(i, 2) * 40));
    out.push({
      date: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      revenue: rev,
      orders,
      users: Math.round(orders * (1.4 + seeded(i, 3) * 0.8)),
    });
  }
  return out;
}

export function categoryDistribution() {
  return [
    { name: "Electronics", value: 4200, color: "oklch(0.85 0.17 200)" },
    { name: "Fashion", value: 2900, color: "oklch(0.7 0.22 300)" },
    { name: "Home", value: 1850, color: "oklch(0.7 0.22 15)" },
    { name: "Beauty", value: 1300, color: "oklch(0.85 0.18 90)" },
    { name: "Sports", value: 980, color: "oklch(0.75 0.2 140)" },
    { name: "Other", value: 720, color: "oklch(0.65 0.04 270)" },
  ];
}

export function topProductsBar() {
  return [
    { name: "Void Receptor", units: 412 },
    { name: "Echo Implants", units: 388 },
    { name: "Onyx Controller", units: 305 },
    { name: "Chronos Band", units: 274 },
    { name: "Nova Sneakers", units: 198 },
    { name: "Lumen Serum", units: 174 },
    { name: "Halo Lamp", units: 142 },
  ];
}

export function activityFeed() {
  return [
    { kind: "order", text: "ORD-4831 placed by alex@atomspot.app", amount: "₹2,499", at: "2m ago", tone: "cyan" },
    { kind: "user", text: "New signup — kai@atomspot.app", at: "6m ago", tone: "purple" },
    { kind: "seller", text: "Seller Lumen Co. approved", at: "14m ago", tone: "rose" },
    { kind: "order", text: "ORD-4830 shipped to Priya S.", amount: "₹820", at: "21m ago", tone: "cyan" },
    { kind: "user", text: "New signup — mira@atomspot.app", at: "38m ago", tone: "purple" },
    { kind: "order", text: "ORD-4828 refunded", amount: "−₹390", at: "1h ago", tone: "rose" },
    { kind: "seller", text: "Onyx Labs submitted 5 products for review", at: "2h ago", tone: "rose" },
    { kind: "user", text: "New signup — jules@atomspot.app", at: "3h ago", tone: "purple" },
  ];
}

export function totals(series: ReturnType<typeof revenueSeries>) {
  const revenue = series.reduce((s, p) => s + p.revenue, 0);
  const orders = series.reduce((s, p) => s + p.orders, 0);
  const users = series.reduce((s, p) => s + p.users, 0);
  const aov = orders ? Math.round(revenue / orders) : 0;
  return { revenue, orders, users, aov };
}
