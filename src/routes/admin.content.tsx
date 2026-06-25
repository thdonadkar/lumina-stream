import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listSiteContent, upsertSiteContent, deleteSiteContent } from "@/lib/site-content.functions";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/admin/content")({
  ssr: false,
  beforeLoad: () => requireRole("admin"),
  head: () => ({ meta: [{ title: "Site content — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

type Row = { key: string; value: any; updated_at?: string };

const PRESETS: Record<string, any> = {
  hero: { title: "", subtitle: "", cta_text: "", cta_link: "/shop" },
  about: { title: "", body: "" },
  contact: { email: "", phone: "", address: "" },
  footer: { tagline: "", copyright: "" },
  faq: { items: [{ q: "", a: "" }] },
};

function Page() {
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [text, setText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const { confirm } = useConfirm();

  const fetchAll = useServerFn(listSiteContent);
  const save = useServerFn(upsertSiteContent);
  const del = useServerFn(deleteSiteContent);

  const load = () => fetchAll().then((d) => setRows(d as any));
  useEffect(() => { load(); }, []);

  function startEdit(r: Row) {
    setEditing(r);
    setText(JSON.stringify(r.value ?? {}, null, 2));
    setJsonError(null);
  }

  function startNew(preset?: string) {
    const value = preset ? PRESETS[preset] ?? {} : {};
    setEditing({ key: preset ?? "", value });
    setText(JSON.stringify(value, null, 2));
    setJsonError(null);
  }

  async function handleSave() {
    if (!editing) return;
    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch (e: any) { setJsonError(e.message); return; }
    try {
      await save({ data: { key: editing.key, value: parsed } });
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e: any) { toast.error(e.message ?? "Save failed"); }
  }

  async function handleDelete(key: string) {
    if (!(await confirm({ title: `Delete "${key}"?`, description: "The site will fall back to default content.", destructive: true, confirmText: "Delete" }))) return;
    await del({ data: { key } });
    toast.success("Deleted");
    load();
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Admin</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">Website content</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} sections · edits go live instantly</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(PRESETS).map((p) => (
            <button key={p} onClick={() => startNew(p)} className="rounded-full px-3 py-1.5 text-xs glass inline-flex items-center gap-1">
              <Plus className="size-3" /> {p}
            </button>
          ))}
          <button onClick={() => startNew()} className="rounded-full px-4 py-1.5 text-xs font-bold bg-foreground text-background inline-flex items-center gap-1">
            <Plus className="size-3.5" /> Custom key
          </button>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.key} className="glass-strong rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">{r.key}</p>
                <pre className="mt-2 text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap break-words">{JSON.stringify(r.value, null, 2)}</pre>
              </div>
              <FileText className="size-4 text-muted-foreground shrink-0" />
            </div>
            <div className="flex gap-1 mt-3">
              <button onClick={() => startEdit(r)} className="rounded-full px-3 py-1 text-xs glass">Edit</button>
              <button onClick={() => handleDelete(r.key)} className="rounded-full px-3 py-1 text-xs glass text-rose-400 inline-flex items-center gap-1">
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="col-span-2 text-center p-12 glass rounded-3xl border border-dashed border-white/10">
            <p className="font-bold text-lg">No content yet</p>
            <p className="text-sm text-muted-foreground mt-1">Pick a preset above to seed the first section.</p>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-2xl space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-lg">Edit content</h3>
              <button onClick={() => setEditing(null)}><X className="size-4" /></button>
            </div>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Key</span>
              <input
                value={editing.key}
                onChange={(e) => setEditing({ ...editing, key: e.target.value })}
                placeholder="e.g. hero, about, contact"
                className="w-full mt-1 glass rounded-xl px-3 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-foreground/30"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Value (JSON)</span>
              <textarea
                value={text}
                onChange={(e) => { setText(e.target.value); setJsonError(null); }}
                rows={14}
                className="w-full mt-1 glass rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-foreground/30 resize-y"
              />
              {jsonError && <p className="text-xs text-rose-400 mt-1">JSON error: {jsonError}</p>}
              <p className="text-[10px] text-muted-foreground mt-1 font-mono">Tip: use the preset chips on the main page to start with the right shape.</p>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-4 py-1.5 text-xs glass">Cancel</button>
              <button onClick={handleSave} className="rounded-full px-4 py-1.5 text-xs font-bold bg-foreground text-background inline-flex items-center gap-1.5">
                <Save className="size-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminNav />
    </div>
  );
}
