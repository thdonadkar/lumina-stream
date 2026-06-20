import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { Flag, Check, Trash2, RotateCcw } from "lucide-react";
import { listAllProducts, setProductStatus, deleteProductAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/products")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({ meta: [{ title: "Products — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const list = useServerFn(listAllProducts);
  const setStatus = useServerFn(setProductStatus);
  const del = useServerFn(deleteProductAdmin);

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => list(),
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const statusMut = useMutation({
    mutationFn: async (p: { id: string; status: "active" | "rejected" | "archived"; force?: boolean }) => {
      const res: any = await setStatus({ data: { id: p.id, status: p.status, force: p.force } });
      if (res?.warn) {
        const ok = await confirm({
          title: `Change status to "${p.status}"?`,
          description: res.message + " Continue anyway?",
          destructive: true,
          confirmText: "Yes, change anyway",
        });
        if (!ok) return { skipped: true };
        await setStatus({ data: { id: p.id, status: p.status, force: true } });
      }
      return { skipped: false, status: p.status };
    },
    onSuccess: (res: any) => {
      if (res?.skipped) return;
      invalidate();
      toast.success(
        res?.status === "active" ? "Approved/Restored" :
        res?.status === "archived" ? "Archived" : "Flagged"
      );
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Archived"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Product moderation</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : isError ? (
        <div className="glass rounded-2xl p-6 text-sm">
          <p className="font-bold text-rose-400 mb-2">Failed to load products</p>
          <p className="text-muted-foreground mb-3">{(error as any)?.message ?? "Unknown error"}</p>
          <button onClick={() => refetch()} className="px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong">Retry</button>
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products in the catalog yet.</p>
      ) : (
        <div className="grid gap-3">
          {data.map((p: any) => (
            <div key={p.id} className="glass-strong rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img referrerPolicy="no-referrer" src={p.images?.[0] ?? ""} alt="" className="size-14 rounded-xl object-cover bg-white/5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    ₹{Number(p.price).toLocaleString()} · stock {p.stock} ·{" "}
                    <span className="font-mono uppercase">{p.status}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end shrink-0">
                {p.status === "archived" ? (
                  <button
                    disabled={statusMut.isPending}
                    onClick={() => statusMut.mutate({ id: p.id, status: "active" })}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <RotateCcw className="size-3" /> Restore
                  </button>
                ) : (
                  <>
                    <button
                      disabled={p.status === "active" || statusMut.isPending}
                      onClick={() => statusMut.mutate({ id: p.id, status: "active" })}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Check className="size-3" /> Approve
                    </button>
                    <button
                      disabled={p.status === "rejected" || statusMut.isPending}
                      onClick={() => statusMut.mutate({ id: p.id, status: "rejected" })}
                      className="px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong inline-flex items-center gap-1 disabled:opacity-40"
                    >
                      <Flag className="size-3 text-rose-400" /> Flag
                    </button>
                    <button
                      onClick={async () => { if (await confirm({ title: `Archive "${p.title}"?`, description: "This hides the product from the catalog but preserves order history. You can restore it later.", destructive: true, confirmText: "Archive" })) deleteMut.mutate(p.id); }}
                      className="px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong inline-flex items-center gap-1"
                    >
                      <Trash2 className="size-3 text-rose-400" /> Archive
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <AdminNav />
    </div>
  );
}
