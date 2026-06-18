import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/RoleGate";
import { AdminNav } from "./admin.dashboard";
import { listReturnRequests, approveReturn, rejectReturn, markRefunded } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/admin/returns")({
  head: () => ({ meta: [{ title: "Returns — Admin" }] }),
  component: () => (
    <RoleGate role="admin">
      <Page />
    </RoleGate>
  ),
});

const REFUND_TONE: Record<string, string> = {
  none: "text-muted-foreground ring-white/10",
  pending: "text-amber-300 ring-amber-300/30",
  approved: "text-cyan ring-cyan/30",
  rejected: "text-rose-400 ring-rose-400/30",
  refunded: "text-emerald-300 ring-emerald-300/30",
};

function Page() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchRows = useServerFn(listReturnRequests);
  const approve = useServerFn(approveReturn);
  const reject = useServerFn(rejectReturn);
  const refund = useServerFn(markRefunded);

  const load = () => { setLoading(true); fetchRows().then(setRows).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  async function act(fn: (a: any) => Promise<any>, args: any, msg: string) {
    try { await fn(args); toast.success(msg); load(); } catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-rose-400 font-mono">Admin</p>
        <h1 className="text-4xl font-extrabold tracking-tighter">Returns & refunds</h1>
        <p className="text-sm text-muted-foreground mt-1">{rows.length} requests</p>
      </header>

      {loading ? <p className="p-8 text-center text-muted-foreground text-sm">Loading…</p> : rows.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center text-muted-foreground">
          <RotateCcw className="size-8 mx-auto mb-3 opacity-50" />
          <p>No return requests at the moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((o) => (
            <div key={o.id} className="glass-strong rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8)}</p>
                  <p className="font-bold text-lg">{formatPrice(Number(o.total))}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.updated_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider ring-1 ${REFUND_TONE[o.refund_status] ?? ""}`}>refund: {o.refund_status}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-mono tracking-wider bg-white/5">{o.status.replace(/_/g, " ")}</span>
                </div>
              </div>

              {o.return_reason && (
                <div className="glass rounded-xl p-3 mb-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-1">Reason</p>
                  <p className="text-sm">{o.return_reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {o.status === "return_requested" && (
                  <>
                    <button onClick={() => act(approve, { data: { id: o.id } }, "Return approved")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-aurora text-background">
                      <CheckCircle2 className="size-3.5" /> Approve
                    </button>
                    <button onClick={() => { const r = prompt("Reason for rejection (optional)") ?? ""; act(reject, { data: { id: o.id, reason: r } }, "Return rejected"); }} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs glass-strong text-rose-400">
                      <XCircle className="size-3.5" /> Reject
                    </button>
                  </>
                )}
                {o.refund_status === "approved" && (
                  <button onClick={() => act(refund, { data: { id: o.id, amount: Number(o.total) } }, "Refund marked complete")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold bg-aurora text-background">
                    <RefreshCw className="size-3.5" /> Mark refunded ({formatPrice(Number(o.total))})
                  </button>
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
