import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/categories")({
  head: () => ({ meta: [{ title: "Categories — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

function Page() {
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
          onClick={() => { if (name) { toast.success(`Created "${name}"`); setName(""); } }}
          className="rounded-full px-4 py-2 text-sm font-bold bg-aurora animate-aurora text-background inline-flex items-center gap-2"
        >
          <Plus className="size-4" /> Add category
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {CATEGORIES.map((c, i) => {
          const I = c.icon;
          return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass-strong rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-xl bg-aurora animate-aurora grid place-items-center text-background">
                  <I className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.subs.length} subs</p>
                </div>
                <button onClick={() => toast("Edit (demo)")} className="size-8 rounded-full glass grid place-items-center"><Edit3 className="size-3.5" /></button>
                <button onClick={() => toast.error("Delete (demo)")} className="size-8 rounded-full glass grid place-items-center"><Trash2 className="size-3.5 text-rose-400" /></button>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.subs.map((s) => (
                  <span key={s.slug} className="px-2 py-0.5 rounded-full glass text-[10px]">{s.name}</span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <AdminNav />
    </div>
  );
}
