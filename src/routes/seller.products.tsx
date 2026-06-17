import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Edit3, Trash2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { products } from "@/lib/products";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/products")({
  head: () => ({ meta: [{ title: "My Products — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const [q, setQ] = useState("");
  const list = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-2">Products</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Manage your active catalog. Demo data shown.
      </p>

      <div className="glass rounded-2xl p-3 flex items-center gap-2 mb-4">
        <Search className="size-4 text-muted-foreground ml-2" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your products…"
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <Link
          to="/seller/add-product"
          className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora animate-aurora text-background"
        >
          + New
        </Link>
      </div>

      <div className="glass-strong rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4">Product</th>
              <th className="text-left p-4 hidden sm:table-cell">Category</th>
              <th className="text-right p-4">Price</th>
              <th className="text-right p-4 hidden md:table-cell">Stock</th>
              <th className="text-right p-4">Status</th>
              <th className="p-4" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
                <td className="p-4 flex items-center gap-3">
                  <img src={p.image} alt="" className="size-10 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell text-muted-foreground">{p.category}</td>
                <td className="p-4 text-right font-mono">${p.price.toLocaleString()}</td>
                <td className="p-4 text-right hidden md:table-cell font-mono">{p.stock ?? 0}</td>
                <td className="p-4 text-right">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ring-1 ${
                    p.inStock ? "text-cyan ring-cyan/30" : "text-rose-400 ring-rose-400/30"
                  }`}>
                    {p.inStock ? "active" : "out"}
                  </span>
                </td>
                <td className="p-4 text-right whitespace-nowrap">
                  <button onClick={() => toast("Editor opens next phase")} className="size-8 rounded-full glass grid place-items-center mr-1">
                    <Edit3 className="size-3.5" />
                  </button>
                  <button onClick={() => toast.error("Delete (demo)")} className="size-8 rounded-full glass grid place-items-center">
                    <Trash2 className="size-3.5 text-rose-400" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <SellerNav />
    </div>
  );
}
