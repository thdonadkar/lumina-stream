import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { ChevronLeft, MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useConfirm } from "@/components/ConfirmDialog";
import { listAddresses, saveAddress, deleteAddress, type AddressInput } from "@/lib/addresses.functions";

export const Route = createFileRoute("/addresses")({
  head: () => ({ meta: [{ title: "Saved addresses — Neural" }] }),
  component: AddressesPage,
});

const EMPTY: AddressInput = {
  label: "", recipient: "", phone: "", line1: "", line2: "",
  city: "", state: "", postal_code: "", country: "IN", is_default: false,
};

function AddressesPage() {
  const { userId, loading } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [editing, setEditing] = useState<AddressInput | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchList = useServerFn(listAddresses);
  const save = useServerFn(saveAddress);
  const del = useServerFn(deleteAddress);
  const { confirm } = useConfirm();

  async function refresh() {
    try { setRows(await fetchList()); } catch { /* */ }
  }
  useEffect(() => { if (userId) refresh(); /* eslint-disable-next-line */ }, [userId]);

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!userId) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to manage addresses</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">Sign in</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    try {
      await save({ data: editing });
      toast.success(editing.id ? "Address updated" : "Address saved");
      setEditing(null);
      refresh();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function onDelete(id: string) {
    if (!(await confirm({ title: "Delete this address?", description: "This cannot be undone.", destructive: true, confirmText: "Delete" }))) return;
    try {
      await del({ data: { id } });
      toast.success("Address deleted");
      refresh();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto pb-24">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="size-4" /> Back to account
      </Link>
      <header className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Account</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Saved addresses</h1>
          <p className="text-xs text-muted-foreground mt-1">{rows.length} saved</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing({ ...EMPTY })} className="rounded-full px-4 py-2 text-sm font-bold bg-aurora text-background inline-flex items-center gap-1">
            <Plus className="size-4" /> Add address
          </button>
        )}
      </header>

      {editing && (
        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="glass-strong rounded-3xl p-5 mb-6 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={editing.label ?? ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} placeholder="Label (Home, Work…)" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
            <input value={editing.recipient} onChange={(e) => setEditing({ ...editing, recipient: e.target.value })} required placeholder="Recipient name *" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
            <input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
            <input value={editing.postal_code} onChange={(e) => setEditing({ ...editing, postal_code: e.target.value })} required placeholder="Postal code *" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
          </div>
          <input value={editing.line1} onChange={(e) => setEditing({ ...editing, line1: e.target.value })} required placeholder="Address line 1 *" className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
          <input value={editing.line2 ?? ""} onChange={(e) => setEditing({ ...editing, line2: e.target.value })} placeholder="Address line 2" className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} required placeholder="City *" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
            <input value={editing.state ?? ""} onChange={(e) => setEditing({ ...editing, state: e.target.value })} placeholder="State" className="glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!editing.is_default} onChange={(e) => setEditing({ ...editing, is_default: e.target.checked })} className="accent-cyan" />
            Set as default address
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-full px-4 py-1.5 text-xs glass">Cancel</button>
            <button disabled={busy} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-50">
              {busy ? "Saving…" : editing.id ? "Update" : "Save address"}
            </button>
          </div>
        </motion.form>
      )}

      {rows.length === 0 && !editing ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <MapPin className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No saved addresses yet.</p>
          <button onClick={() => setEditing({ ...EMPTY })} className="mt-4 px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-strong rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="font-bold">{a.label || a.recipient}</p>
                  {a.is_default && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono bg-cyan/10 text-cyan inline-flex items-center gap-1">
                      <Star className="size-3" /> Default
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="text-foreground">{a.recipient}</p>
                <p>{a.line1}{a.line2 ? `, ${a.line2}` : ""}</p>
                <p>{a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code}</p>
                {a.phone && <p>📞 {a.phone}</p>}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setEditing({
                    id: a.id, label: a.label, recipient: a.recipient, phone: a.phone,
                    line1: a.line1, line2: a.line2, city: a.city, state: a.state,
                    postal_code: a.postal_code, country: a.country, is_default: a.is_default,
                  })}
                  className="flex-1 rounded-full px-3 py-1.5 text-xs glass hover:glass-strong inline-flex items-center justify-center gap-1"
                >
                  <Pencil className="size-3" /> Edit
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  className="rounded-full px-3 py-1.5 text-xs glass hover:bg-rose-500/10 hover:text-rose-300 inline-flex items-center justify-center gap-1"
                >
                  <Trash2 className="size-3" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
