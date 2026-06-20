import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Power } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import {
  listCategoriesAdmin, createCategory, updateCategory, deleteCategory,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/categories")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({ meta: [{ title: "Categories — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const list = useServerFn(listCategoriesAdmin);
  const create = useServerFn(createCategory);
  const update = useServerFn(updateCategory);
  const del = useServerFn(deleteCategory);

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-categories"] });

  const createMut = useMutation({
    mutationFn: (name: string) => create({ data: { name } }),
    onSuccess: () => { invalidate(); toast.success("Category created"); setName(""); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const toggleMut = useMutation({
    mutationFn: (c: any) => update({ data: { id: c.id, is_active: !c.is_active } }),
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Deleted"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const [name, setName] = useState("");

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">Categories</h1>

      <div className="glass-strong rounded-3xl p-5 mb-6 flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New main category…"
          className="flex-1 min-w-[180px] bg-transparent outline-none px-3 py-2 rounded-xl ring-1 ring-white/10 text-sm"
        />
        <button
          disabled={!name.trim() || createMut.isPending}
          onClick={() => createMut.mutate(name.trim())}
          className="rounded-full px-4 py-2 text-sm font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Plus className="size-4" /> Add category
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cats.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-strong rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">/{c.slug}</p>
                </div>
                <button
                  aria-label={c.is_active ? "Disable category" : "Enable category"}
                  onClick={() => toggleMut.mutate(c)}
                  className="size-8 rounded-full glass grid place-items-center"
                  title={c.is_active ? "Active" : "Inactive"}
                >
                  <Power className={`size-3.5 ${c.is_active ? "text-cyan" : "text-muted-foreground"}`} />
                </button>
                <button
                  aria-label="Delete category"
                  onClick={async () => { if (await confirm({ title: `Delete "${c.name}"?`, description: "Products in this category will be uncategorized.", destructive: true, confirmText: "Delete" })) deleteMut.mutate(c.id); }}
                  className="size-8 rounded-full glass grid place-items-center"
                >
                  <Trash2 className="size-3.5 text-rose-400" />
                </button>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ring-1 ${c.is_active ? "text-cyan ring-cyan/30" : "text-muted-foreground ring-white/10"}`}>
                {c.is_active ? "active" : "inactive"}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      <AdminNav />
    </div>
  );
}
