import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { Flag, Check, Trash2 } from "lucide-react";
import { listAllProducts, setProductStatus, deleteProductAdmin } from "@/lib/admin.functions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/products")({
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

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-products"] });

  const statusMut = useMutation({
    mutationFn: (p: { id: string; status: "active" | "rejected" }) =>
      setStatus({ data: p }),
    onSuccess: (_d, v) => { invalidate(); toast.success(v.status === "active" ? "Approved" : "Flagged"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Product moderation</h1>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No products in the catalog yet.</p>
      ) : (
        <div className="grid gap-3">
          {data.map((p: any) => (
            <div key={p.id} className="glass-strong rounded-2xl p-4 flex items-center gap-4 flex-wrap">
              <img src={p.images?.[0] ?? ""} alt="" className="size-14 rounded-xl object-cover bg-white/5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  ₹{Number(p.price).toLocaleString()} · stock {p.stock} ·{" "}
                  <span className="font-mono uppercase">{p.status}</span>
                </p>
              </div>
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
                onClick={async () => { if (await confirm({ title: `Delete "${p.title}"?`, description: "This permanently removes the product from the catalog.", destructive: true, confirmText: "Delete" })) deleteMut.mutate(p.id); }}
                className="px-3 py-1.5 rounded-full text-xs font-bold glass hover:glass-strong inline-flex items-center gap-1"
              >
                <Trash2 className="size-3 text-rose-400" /> Delete
              </button>
            </div>
          ))}
        </div>
      )}
      <AdminNav />
    </div>
  );
}
