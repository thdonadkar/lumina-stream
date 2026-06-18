import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, X, ToggleLeft, ToggleRight, Upload } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listAllBanners, saveBanner, deleteBanner } from "@/lib/banners.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

type Banner = {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  position?: number;
  active?: boolean;
};

const EMPTY: Banner = { title: "", subtitle: "", image_url: "", cta_text: "Shop now", cta_link: "/shop", position: 0, active: true };

function Page() {
  const [banners, setBanners] = useState<any[]>([]);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [uploading, setUploading] = useState(false);
  const fetchAll = useServerFn(listAllBanners);
  const save = useServerFn(saveBanner);
  const del = useServerFn(deleteBanner);

  const load = () => fetchAll().then(setBanners);
  useEffect(() => { load(); }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const path = `banners/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file);
      if (error) throw error;
      const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      setEditing((b) => ({ ...(b ?? EMPTY), image_url: data?.signedUrl ?? "" }));
      toast.success("Image uploaded");
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  }

  async function handleSave() {
    if (!editing) return;
    try {
      await save({ data: editing as any });
      toast.success(editing.id ? "Banner updated" : "Banner created");
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete banner?")) return;
    await del({ data: { id } }); toast.success("Deleted"); load();
  }

  async function toggleActive(b: any) {
    await save({ data: { ...b, active: !b.active } as any });
    load();
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-rose-400 font-mono">Admin</p>
          <h1 className="text-4xl font-extrabold tracking-tighter">Homepage banners</h1>
          <p className="text-sm text-muted-foreground mt-1">{banners.length} total · live on homepage</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold bg-aurora animate-aurora text-background">
          <Plus className="size-3.5" /> New banner
        </button>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {banners.map((b) => (
          <div key={b.id} className="glass-strong rounded-2xl overflow-hidden">
            <div className="h-32 bg-secondary relative overflow-hidden">
              {b.image_url ? <img src={b.image_url} alt="" className="size-full object-cover" /> : <div className="size-full bg-aurora opacity-30" />}
              <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase ${b.active ? "bg-emerald-400/20 text-emerald-300" : "bg-white/10 text-muted-foreground"}`}>{b.active ? "live" : "hidden"}</span>
            </div>
            <div className="p-4">
              <p className="font-bold">{b.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{b.subtitle}</p>
              <div className="flex gap-1 mt-3">
                <button onClick={() => setEditing(b)} className="rounded-full px-3 py-1 text-xs glass">Edit</button>
                <button onClick={() => toggleActive(b)} className="rounded-full px-3 py-1 text-xs glass inline-flex items-center gap-1">
                  {b.active ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />} {b.active ? "Hide" : "Show"}
                </button>
                <button onClick={() => handleDelete(b.id)} className="rounded-full px-3 py-1 text-xs glass text-rose-400 inline-flex items-center gap-1">
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="col-span-2 text-center p-12 glass rounded-3xl border border-dashed border-white/10">
            <div className="size-14 mx-auto rounded-2xl bg-aurora animate-aurora grid place-items-center mb-4">
              <Plus className="size-6 text-background" />
            </div>
            <p className="font-bold text-lg">No banners yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Banners appear in the <strong>Featured Offers</strong> section on the homepage. Create your first to start driving traffic.
            </p>
            <button onClick={() => setEditing({ ...EMPTY })} className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-bold bg-aurora animate-aurora text-background">
              <Plus className="size-3.5" /> Create first banner
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-strong rounded-3xl p-6 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-lg">{editing.id ? "Edit banner" : "New banner"}</h3>
              <button onClick={() => setEditing(null)}><X className="size-4" /></button>
            </div>
            <Input label="Title *" value={editing.title} onChange={(v) => setEditing({ ...editing!, title: v })} />
            <Input label="Subtitle" value={editing.subtitle ?? ""} onChange={(v) => setEditing({ ...editing!, subtitle: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="CTA text" value={editing.cta_text ?? ""} onChange={(v) => setEditing({ ...editing!, cta_text: v })} />
              <Input label="CTA link" value={editing.cta_link ?? ""} onChange={(v) => setEditing({ ...editing!, cta_link: v })} />
            </div>
            <Input label="Position" value={String(editing.position ?? 0)} onChange={(v) => setEditing({ ...editing!, position: Number(v) || 0 })} />
            <label className="block">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">Banner image</span>
              <div className="mt-1.5 glass rounded-xl p-3 flex items-center gap-3">
                {editing.image_url && <img src={editing.image_url} alt="" className="size-14 rounded-lg object-cover" />}
                <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-full px-3 py-1.5 text-xs glass-strong hover:bg-white/5">
                  <Upload className="size-3.5" /> {uploading ? "Uploading…" : "Upload image"}
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              </div>
            </label>
            <label className="text-xs flex items-center gap-2 pt-1">
              <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing!, active: e.target.checked })} className="size-4 accent-cyan" />
              <span>Active (visible on homepage)</span>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="rounded-full px-4 py-1.5 text-xs glass">Cancel</button>
              <button onClick={handleSave} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background inline-flex items-center gap-1.5">
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

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan" />
    </label>
  );
}
