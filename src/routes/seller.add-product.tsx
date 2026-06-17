import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Save, FileText } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { CATEGORIES } from "@/lib/categories";
import { toast } from "sonner";

export const Route = createFileRoute("/seller/add-product")({
  head: () => ({ meta: [{ title: "Add product — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

function Page() {
  const [status, setStatus] = useState<"draft" | "active">("draft");
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <h1 className="text-4xl font-extrabold tracking-tighter mb-6">New product</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success(`Product saved as ${status}`, { description: "Persistence wires up next phase." });
        }}
        className="glass-strong rounded-3xl p-6 sm:p-8 space-y-5"
      >
        <Field label="Title" required><input className="input" required placeholder="Aurora Drape Dress" /></Field>
        <Field label="Tagline"><input className="input" placeholder="Liquid satin, asymmetric cut" /></Field>
        <Field label="Description">
          <textarea rows={5} className="input resize-none" placeholder="Tell the story…" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Price (USD)" required><input type="number" className="input" required min={0} step="0.01" /></Field>
          <Field label="Discount %"><input type="number" className="input" min={0} max={90} placeholder="0" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" required>
            <select className="input" required>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Stock" required><input type="number" className="input" required min={0} placeholder="0" /></Field>
        </div>

        <Field label="Images">
          <label className="glass rounded-2xl px-4 py-8 grid place-items-center cursor-pointer hover:glass-strong transition-all border-2 border-dashed border-white/10">
            <Upload className="size-5 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">Drop files or click to upload (demo)</span>
            <input type="file" multiple accept="image/*" className="hidden" />
          </label>
        </Field>

        <div className="flex items-center justify-between pt-2">
          <div className="glass rounded-full p-1 flex text-xs">
            {(["draft", "active"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`px-4 py-1.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                  status === s ? "bg-aurora animate-aurora text-background" : "text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold bg-aurora animate-aurora text-background"
          >
            {status === "draft" ? <FileText className="size-4" /> : <Save className="size-4" />}
            Save {status}
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
