import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Store, Package, ShoppingBag, Tag, ShieldAlert } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin — Neural" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const TILES = [
  { to: "/admin/users", label: "Users", icon: Users, value: "12,481", delta: "+312 / 7d" },
  { to: "/admin/sellers", label: "Sellers", icon: Store, value: "238", delta: "9 pending" },
  { to: "/admin/products", label: "Products", icon: Package, value: "4,902", delta: "14 flagged" },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, value: "1,028", delta: "+82 today" },
  { to: "/admin/categories", label: "Categories", icon: Tag, value: "9 main", delta: "32 subs" },
];

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-rose-400 font-mono flex items-center gap-2">
          <ShieldAlert className="size-3" /> Admin control center
        </p>
        <h1 className="text-4xl font-extrabold tracking-tighter mt-1">Operations</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {TILES.map((t, i) => {
          const I = t.icon;
          return (
            <motion.div
              key={t.to}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={t.to}
                className="block glass hover:glass-strong rounded-2xl p-5 relative overflow-hidden group transition-all"
              >
                <I className="size-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-3">{t.label}</p>
                <p className="text-2xl font-extrabold tracking-tighter mt-1">{t.value}</p>
                <p className="text-[11px] text-cyan font-mono mt-1">{t.delta}</p>
                <div className="absolute -inset-12 bg-aurora opacity-0 group-hover:opacity-15 blur-3xl transition-opacity" />
              </Link>
            </motion.div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-bold tracking-tight mb-4">Pending moderation</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span>9 seller applications</span><span className="text-cyan font-mono">REVIEW</span></li>
            <li className="flex justify-between"><span>14 flagged products</span><span className="text-rose-400 font-mono">FLAG</span></li>
            <li className="flex justify-between"><span>3 refund disputes</span><span className="text-purple-400 font-mono">URGENT</span></li>
          </ul>
        </div>
        <div className="glass-strong rounded-3xl p-6">
          <h3 className="font-bold tracking-tight mb-4">Platform health</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between"><span>Uptime</span><span className="text-cyan font-mono">99.98%</span></li>
            <li className="flex justify-between"><span>Avg checkout latency</span><span className="font-mono">182ms</span></li>
            <li className="flex justify-between"><span>Failed payments (24h)</span><span className="text-rose-400 font-mono">0.6%</span></li>
          </ul>
        </div>
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
    { to: "/admin/categories", label: "Categories" },
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
