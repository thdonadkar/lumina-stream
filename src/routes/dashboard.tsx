import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Package, MapPin, Sparkles, TrendingUp, Heart, LifeBuoy, LogOut, Plus, Trash2, Star, ShoppingBag, Bell } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders } from "@/lib/orders.functions";
import { listAddresses, saveAddress, deleteAddress } from "@/lib/addresses.functions";
import { formatPrice } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { OrderListSkeleton } from "@/components/skeletons";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Account — Neural" }] }),
  component: Dashboard,
});

type Order = Awaited<ReturnType<typeof listMyOrders>>[number];
type Addr = Awaited<ReturnType<typeof listAddresses>>[number];

const STATUS_TONE: Record<string, string> = {
  pending: "text-amber-300 bg-amber-300/10",
  confirmed: "text-amber-200 bg-amber-200/10",
  packed: "text-purple bg-purple/10",
  shipped: "text-cyan bg-cyan/10",
  out_for_delivery: "text-cyan bg-cyan/10",
  delivered: "text-emerald-300 bg-emerald-300/10",
  cancelled: "text-rose-400 bg-rose-400/10",
  return_requested: "text-rose-300 bg-rose-300/10",
  returned: "text-rose-300 bg-rose-300/10",
  refunded: "text-emerald-200 bg-emerald-200/10",
};

const COUNTRIES = ["IN", "US", "GB", "AE", "AU", "CA", "DE", "FR", "JP", "SG"];

function Dashboard() {
  const { userId, email, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"orders" | "addresses" | "preferences">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [addrs, setAddrs] = useState<Addr[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [prefs, setPrefs] = useState({ emailUpdates: true, smsUpdates: false, marketing: false });

  const fetchOrders = useServerFn(listMyOrders);
  const fetchAddrs = useServerFn(listAddresses);
  const saveAddr = useServerFn(saveAddress);
  const delAddr = useServerFn(deleteAddress);

  useEffect(() => {
    if (!userId) return;
    fetchOrders().then(setOrders).finally(() => setLoadingOrders(false));
    fetchAddrs().then(setAddrs).catch(() => {});
    try {
      const p = localStorage.getItem("neural-prefs");
      if (p) setPrefs(JSON.parse(p));
    } catch { /* */ }
  }, [userId, fetchOrders, fetchAddrs]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  async function onSaveAddress(payload: any) {
    try {
      await saveAddr({ data: payload });
      toast.success("Address saved");
      setShowAddrForm(false);
      setAddrs(await fetchAddrs());
    } catch (e: any) { toast.error(e.message); }
  }

  async function onDeleteAddress(id: string) {
    try {
      await delAddr({ data: { id } });
      setAddrs((xs) => xs.filter((x) => x.id !== id));
      toast.success("Address removed");
    } catch (e: any) { toast.error(e.message); }
  }

  function savePrefs(next: typeof prefs) {
    setPrefs(next);
    localStorage.setItem("neural-prefs", JSON.stringify(next));
    toast.success("Preferences updated");
  }

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!userId) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to view your account</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);
  const deliveredCount = orders.filter((o) => o.status === "delivered").length;

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto pb-24">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl p-6 md:p-8 mb-8 relative overflow-hidden">
        <div className="absolute -inset-1 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="size-16 sm:size-20 rounded-2xl bg-aurora animate-aurora shadow-glow-cyan grid place-items-center font-extrabold text-2xl text-background shrink-0">
            {(email ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Member account</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight truncate">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1 truncate">{email}</p>
          </div>
          <button onClick={handleLogout} className="rounded-full px-4 py-2 text-xs font-bold glass hover:bg-rose-400/20 hover:text-rose-400 transition-all inline-flex items-center gap-1.5">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Orders", value: String(orders.length), icon: Package, accent: "text-cyan" },
          { label: "Delivered", value: String(deliveredCount), icon: TrendingUp, accent: "text-emerald-300" },
          { label: "Total spent", value: formatPrice(totalSpent), icon: Sparkles, accent: "text-rose-400" },
          { label: "Addresses", value: String(addrs.length), icon: MapPin, accent: "text-purple" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass rounded-2xl p-5">
            <s.icon className={`size-5 ${s.accent} mb-3`} />
            <p className="text-2xl font-extrabold font-mono">{s.value}</p>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <QA to="/shop" icon={ShoppingBag} label="Continue shopping" />
        <QA to="/wishlist" icon={Heart} label="My wishlist" />
        <QA to="/support" icon={LifeBuoy} label="Support" />
        <QA onClick={() => setTab("addresses")} icon={MapPin} label="Manage addresses" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {[
          { id: "orders", label: "Orders", icon: Package },
          { id: "addresses", label: "Addresses", icon: MapPin },
          { id: "preferences", label: "Preferences", icon: Bell },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider inline-flex items-center gap-1.5 ${
              tab === t.id ? "bg-aurora text-background font-bold" : "glass text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="size-3.5" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "orders" && (
        <div className="glass-strong rounded-3xl p-6">
          {loadingOrders ? (
            <OrderListSkeleton count={4} />
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
              <p className="text-muted-foreground">No orders yet.</p>
              <Link to="/shop" className="mt-4 inline-block px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">Start shopping</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o, i) => {
                const items = (o as any).order_items ?? [];
                const first = items[0];
                return (
                  <motion.div key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link to="/orders/$id" params={{ id: o.id }} className="glass rounded-2xl p-4 flex items-center gap-4 hover:glass-strong transition-all">
                      <div className="size-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                        {first?.image && <img referrerPolicy="no-referrer" src={first.image} alt="" className="size-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">
                          {first?.title ?? "Order"}
                          {items.length > 1 && <span className="text-muted-foreground text-sm"> +{items.length - 1} more</span>}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">
                          #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-cyan">{formatPrice(Number(o.total))}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${STATUS_TONE[o.status] ?? ""}`}>
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "addresses" && (
        <div className="glass-strong rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Saved addresses</h2>
            <button onClick={() => setShowAddrForm((v) => !v)} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background inline-flex items-center gap-1">
              <Plus className="size-3.5" /> {showAddrForm ? "Cancel" : "Add address"}
            </button>
          </div>
          {showAddrForm && <AddressForm onSubmit={onSaveAddress} />}
          {addrs.length === 0 && !showAddrForm ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No saved addresses yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {addrs.map((a) => (
                <div key={a.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold truncate">{a.recipient}</p>
                        {a.is_default && <Star className="size-3.5 text-amber-300 fill-amber-300" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
                        {a.city}{a.state ? `, ${a.state}` : ""} {a.postal_code}<br />
                        {a.country} {a.phone && `· ${a.phone}`}
                      </p>
                    </div>
                    <button onClick={() => onDeleteAddress(a.id)} className="text-muted-foreground hover:text-rose-400" aria-label="Delete address">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "preferences" && (
        <div className="glass-strong rounded-3xl p-6 space-y-3">
          <h2 className="text-xl font-bold mb-2">Notification preferences</h2>
          {([
            ["emailUpdates", "Email me about order updates"],
            ["smsUpdates", "SMS me about shipping & delivery"],
            ["marketing", "Send me promotions and offers"],
          ] as const).map(([k, label]) => (
            <label key={k} className="flex items-center justify-between glass rounded-xl p-4 cursor-pointer">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={prefs[k]}
                onChange={(e) => savePrefs({ ...prefs, [k]: e.target.checked })}
                className="size-5 accent-cyan"
              />
            </label>
          ))}
          <p className="text-[11px] text-muted-foreground">Preferences are saved to your device.</p>
        </div>
      )}
    </div>
  );
}

function QA({ to, onClick, icon: Icon, label }: { to?: string; onClick?: () => void; icon: any; label: string }) {
  const inner = (
    <div className="glass hover:glass-strong rounded-2xl p-4 flex items-center gap-3 transition-all text-left w-full">
      <div className="size-10 rounded-xl bg-aurora animate-aurora grid place-items-center text-background shrink-0">
        <Icon className="size-4" />
      </div>
      <p className="text-sm font-semibold truncate">{label}</p>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : <button onClick={onClick} className="w-full">{inner}</button>;
}

function AddressForm({ onSubmit }: { onSubmit: (p: any) => void }) {
  const [f, setF] = useState({
    label: "Home", recipient: "", phone: "", line1: "", line2: "",
    city: "", state: "", postal_code: "", country: "IN", is_default: false,
  });
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (f.country === "IN") {
      if (!/^\d{6}$/.test(f.postal_code)) { alert("Pincode must be 6 digits for India"); return; }
      if (f.phone && !/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10))) {
        alert("Enter a valid 10-digit Indian phone number"); return;
      }
    } else if (f.phone && f.phone.replace(/\D/g, "").length < 7) {
      alert("Enter a valid phone number"); return;
    }
    onSubmit(f);
  }
  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-4 space-y-3 mt-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Label" value={f.label} onChange={(v) => setF({ ...f, label: v })} />
        <Input label="Recipient name *" value={f.recipient} onChange={(v) => setF({ ...f, recipient: v })} required />
        <Input label={`Phone${f.country === "IN" ? " (10 digits) *" : ""}`} value={f.phone} onChange={(v) => setF({ ...f, phone: v })} required={f.country === "IN"} />
        <Input label={`${f.country === "IN" ? "Pincode" : "Postal code"} *`} value={f.postal_code} onChange={(v) => setF({ ...f, postal_code: v })} required />
        <Input label="Address line 1 *" value={f.line1} onChange={(v) => setF({ ...f, line1: v })} required className="sm:col-span-2" />
        <Input label="Address line 2" value={f.line2} onChange={(v) => setF({ ...f, line2: v })} className="sm:col-span-2" />
        <Input label="City *" value={f.city} onChange={(v) => setF({ ...f, city: v })} required />
        <Input label="State / Region *" value={f.state} onChange={(v) => setF({ ...f, state: v })} required />
        <label className="text-xs">
          <span className="block text-muted-foreground mb-1 uppercase tracking-wider font-mono">Country</span>
          <select value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} className="w-full glass rounded-xl px-3 py-2 text-sm outline-none">
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-xs flex items-center gap-2 mt-6">
          <input type="checkbox" checked={f.is_default} onChange={(e) => setF({ ...f, is_default: e.target.checked })} className="size-4 accent-cyan" />
          <span>Default shipping address</span>
        </label>
      </div>
      <div className="flex justify-end">
        <button className="rounded-full px-5 py-2 text-xs font-bold bg-aurora text-background">Save address</button>
      </div>
    </form>
  );
}

function Input({ label, value, onChange, required, className }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; className?: string }) {
  return (
    <label className={`text-xs ${className ?? ""}`}>
      <span className="block text-muted-foreground mb-1 uppercase tracking-wider font-mono">{label}</span>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full glass rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-cyan"
      />
    </label>
  );
}
