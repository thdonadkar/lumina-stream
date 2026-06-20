import { createFileRoute, Link } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Trash2, Pencil } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { listMyProducts, deleteMyProduct } from "@/lib/products.functions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/seller/products")({
  ssr: false,
  beforeLoad: () => requireRole("seller"),
  head: () => ({ meta: [{ title: "My Products — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const listFn = useServerFn(listMyProducts);
  const deleteFn = useServerFn(deleteMyProduct);

  const { data = [], isLoading } = useQuery({
    queryKey: ["my-products"],
    queryFn: () => listFn(),
    retry: false,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["my-products"] }); toast.success("Archived"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const filtered = (data as any[]).filter((p) =>
    p.title.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-2">Products</h1>
      <p className="text-sm text-muted-foreground mb-6">Manage your active catalog.</p>

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
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px] table-fixed">
          <thead className="text-xs uppercase tracking-widest text-muted-foreground">
            <tr className="border-b border-white/5">
              <th className="text-left p-4 w-[42%]">Product</th>
              <th className="text-right p-4 w-[18%]">Price</th>
              <th className="text-right p-4 w-[14%] hidden md:table-cell">Stock</th>
              <th className="text-right p-4 w-[14%]">Status</th>
              <th className="text-right p-4 w-[96px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="p-4 text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No products yet. Add your first one!</td></tr>
            ) : filtered.map((p: any) => (
              <motion.tr
                key={p.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-3 min-w-0">
                    <img referrerPolicy="no-referrer" src={p.images?.[0] ?? ""} alt="" className="size-10 rounded-lg object-cover bg-white/5 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.tagline}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-right align-middle font-mono">₹{Number(p.price).toLocaleString()}</td>
                <td className="p-4 text-right align-middle hidden md:table-cell font-mono">{p.stock ?? 0}</td>
                <td className="p-4 text-right align-middle">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ring-1 ${
                    p.status === "active" ? "text-cyan ring-cyan/30"
                    : p.status === "rejected" ? "text-rose-400 ring-rose-400/30"
                    : "text-muted-foreground ring-white/10"
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 whitespace-nowrap text-right align-middle">
                  <div className="inline-flex items-center justify-end gap-2 align-middle">
                    <Link
                      to="/seller/edit-product/$id"
                      params={{ id: p.id }}
                      aria-label="Edit product"
                      className="size-8 rounded-full glass grid place-items-center shrink-0"
                    >
                      <Pencil className="size-3.5 text-cyan" />
                    </Link>
                    <button
                      aria-label="Delete product"
                      onClick={async () => { if (await confirm({ title: `Delete "${p.title}"?`, description: "This permanently removes the product from your catalog.", destructive: true, confirmText: "Delete" })) deleteMut.mutate(p.id); }}
                      className="size-8 rounded-full glass grid place-items-center shrink-0"
                    >
                      <Trash2 className="size-3.5 text-rose-400" />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <SellerNav />
    </div>
  );
}
