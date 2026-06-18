import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Save, FileText, X } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createProduct } from "@/lib/products.functions";

export const Route = createFileRoute("/seller/add-product")({
  head: () => ({ meta: [{ title: "Add product — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"draft" | "active">("active");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", tagline: "", description: "", price: "", discount_percent: "0",
    stock: "1", category_slug: "", badge: "",
  });
  const createFn = useServerFn(createProduct);

  function setF<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function uploadFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []); if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of files) {
        if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} > 5MB skipped`); continue; }
        const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${f.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { error } = await supabase.storage.from("product-images").upload(path, f);
        if (error) throw error;
        const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      setImages((arr) => [...arr, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const row = await createFn({
        data: {
          title: form.title,
          tagline: form.tagline || null,
          description: form.description || null,
          price: Number(form.price),
          discount_percent: Number(form.discount_percent) || 0,
          stock: Number(form.stock),
          category_slug: form.category_slug || null,
          badge: form.badge || null,
          images,
          status,
        },
      });
      toast.success(`Product saved as ${status}`, { description: row?.title });
      nav({ to: "/seller/products" });
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">New product</h1>

      <form onSubmit={onSubmit} className="glass-strong rounded-3xl p-6 sm:p-8 space-y-5">
        <Field label="Title" required><input value={form.title} onChange={(e) => setF("title", e.target.value)} className="input" required placeholder="Aurora Drape Dress" /></Field>
        <Field label="Tagline"><input value={form.tagline} onChange={(e) => setF("tagline", e.target.value)} className="input" placeholder="Liquid satin, asymmetric cut" /></Field>
        <Field label="Description"><textarea value={form.description} onChange={(e) => setF("description", e.target.value)} rows={5} className="input resize-none" placeholder="Tell the story…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (₹)" required><input value={form.price} onChange={(e) => setF("price", e.target.value)} type="number" className="input" required min={0} step="0.01" /></Field>
          <Field label="Discount %"><input value={form.discount_percent} onChange={(e) => setF("discount_percent", e.target.value)} type="number" className="input" min={0} max={90} placeholder="0" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required>
            <select value={form.category_slug} onChange={(e) => setF("category_slug", e.target.value)} className="input" required>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (<option key={c.slug} value={c.slug}>{c.name}</option>))}
            </select>
          </Field>
          <Field label="Stock" required><input value={form.stock} onChange={(e) => setF("stock", e.target.value)} type="number" className="input" required min={0} /></Field>
        </div>
        <Field label="Promotion badge (optional)"><input value={form.badge} onChange={(e) => setF("badge", e.target.value)} className="input" placeholder="e.g. New · Bestseller · 30% off" /></Field>

        <Field label="Images (real upload — stored in Cloud)">
          <label className="glass rounded-2xl px-4 py-8 grid place-items-center cursor-pointer hover:glass-strong transition-all border-2 border-dashed border-white/10">
            <Upload className="size-5 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">{uploading ? "Uploading…" : "Drop files or click to upload (max 5MB each)"}</span>
            <input type="file" multiple accept="image/*" className="hidden" onChange={uploadFiles} />
          </label>
          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {images.map((url, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden glass">
                  <img src={url} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setImages((a) => a.filter((_, j) => j !== i))} className="absolute top-1 right-1 size-5 rounded-full bg-black/60 grid place-items-center opacity-0 group-hover:opacity-100">
                    <X className="size-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Field>

        <div className="flex items-center justify-between pt-2">
          <div className="glass rounded-full p-1 flex text-xs">
            {(["draft", "active"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)}
                className={`px-4 py-1.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                  status === s ? "bg-aurora animate-aurora text-background" : "text-muted-foreground"
                }`}>{s}</button>
            ))}
          </div>
          <button type="submit" disabled={busy || uploading} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold bg-aurora animate-aurora text-background disabled:opacity-50">
            {status === "draft" ? <FileText className="size-4" /> : <Save className="size-4" />}
            {busy ? "Saving…" : `Save ${status}`}
          </button>
        </div>
      </form>

      <SellerNav />
      <style>{`.input{width:100%;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;padding:0.625rem 0.875rem;font-size:0.875rem;outline:none;transition:border-color .2s}.input:focus{border-color:rgba(255,255,255,0.25)}`}</style>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground font-mono">
        {label}{required && <span className="text-rose-400 ml-1">*</span>}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
