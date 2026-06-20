import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listSellersAdmin, setUserRole } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sellers")({
  head: () => ({ meta: [{ title: "Sellers — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const qc = useQueryClient();
  const list = useServerFn(listSellersAdmin);
  const setRole = useServerFn(setUserRole);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: () => list(),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => setRole({ data: { id, role: "seller", grant: false } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-sellers"] }); toast.success("Seller revoked"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-2">Sellers</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Active sellers on the platform. To promote a buyer to seller, use the Users page.
      </p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No sellers yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((s: any) => (
            <div key={s.id} className="glass-strong rounded-2xl p-5">
              <p className="font-mono text-xs text-muted-foreground truncate">{s.id.slice(0, 8)}…</p>
              <p className="text-xl font-bold tracking-tight mt-1">{s.display_name ?? "Unnamed"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {s.products_total} products · {s.products_active} active · {s.products_pending} pending
              </p>
              {s.is_blocked && (
                <p className="text-[10px] font-mono uppercase text-rose-400 mt-2">Blocked</p>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { if (confirm(`Revoke seller role from ${s.display_name ?? s.id.slice(0, 8)}?`)) revokeMut.mutate(s.id); }}
                  className="flex-1 px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong"
                >
                  Revoke seller
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminNav />
    </div>
  );
}
