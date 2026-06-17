import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { products } from "@/lib/products";
import { Flag, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Product moderation</h1>
      <div className="grid gap-3">
        {products.slice(0, 8).map((p) => (
          <div key={p.id} className="glass-strong rounded-2xl p-4 flex items-center gap-4 flex-wrap">
            <img src={p.image} alt="" className="size-14 rounded-xl object-cover" />
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground truncate">{p.category} · ${p.price.toLocaleString()}</p>
            </div>
            <button onClick={() => toast.success("Approved")} className="px-3 py-1.5 rounded-full text-xs font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-1">
              <Check className="size-3" /> Approve
            </button>
            <button onClick={() => toast.error("Flagged")} className="px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong inline-flex items-center gap-1">
              <Flag className="size-3 text-rose-400" /> Flag
            </button>
          </div>
        ))}
      </div>
      <AdminNav />
    </div>
  );
}
