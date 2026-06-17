import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({ meta: [{ title: "Sellers — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const PENDING = [
  { id: "s_201", brand: "Lumen Co.", products: 12, revenue: "$48k" },
  { id: "s_202", brand: "Onyx Labs", products: 5, revenue: "—" },
  { id: "s_203", brand: "Prism Studio", products: 28, revenue: "$210k" },
];

function Page() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Seller applications</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PENDING.map((s) => (
          <div key={s.id} className="glass-strong rounded-2xl p-5">
            <p className="font-mono text-xs text-muted-foreground">{s.id}</p>
            <p className="text-xl font-bold tracking-tight mt-1">{s.brand}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.products} products · {s.revenue}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => toast.success("Approved")} className="flex-1 px-3 py-1.5 rounded-full text-xs font-bold bg-aurora animate-aurora text-background">Approve</button>
              <button onClick={() => toast.error("Rejected")} className="flex-1 px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong">Reject</button>
            </div>
          </div>
        ))}
      </div>
      <AdminNav />
    </div>
  );
}
