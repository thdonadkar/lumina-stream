import { createFileRoute } from "@tanstack/react-router";
import { requireRole } from "@/lib/route-guards";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Send, ChevronLeft, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { RoleGate } from "@/components/RoleGate";
import { SellerNav } from "./seller.dashboard";
import { useTicketRealtime } from "@/hooks/use-ticket-realtime";
import { relativeTimeShort, senderLabel } from "@/lib/support-format";
import { listSellerTickets, getTicketThread, replyToTicket, setTicketStatus, markTicketRead } from "@/lib/support.functions";

export const Route = createFileRoute("/seller/support")({
  ssr: false,
  beforeLoad: () => requireRole("seller"),
  head: () => ({ meta: [{ title: "Support — Seller" }] }),
  component: () => (
    <RoleGate role="seller">
      <Page />
    </RoleGate>
  ),
});

const STATUS_TONE: Record<string, string> = {
  open: "text-amber-300 bg-amber-300/10",
  in_progress: "text-cyan bg-cyan/10",
  resolved: "text-emerald-300 bg-emerald-300/10",
  closed: "text-muted-foreground bg-white/5",
};

function Page() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchList = useServerFn(listSellerTickets);
  const fetchThread = useServerFn(getTicketThread);
  const send = useServerFn(replyToTicket);
  const setStatus = useServerFn(setTicketStatus);
  const markRead = useServerFn(markTicketRead);

  async function refreshList() {
    try { setTickets(await fetchList()); } catch (e: any) { toast.error(e.message); }
  }
  async function openTicket(id: string) {
    setActiveId(id); setThread(null);
    try {
      const t = await fetchThread({ data: { id } });
      setThread(t);
      await markRead({ data: { id } });
      refreshList();
    } catch { /* */ }
  }
  const onRealtimeInsert = useCallback((row: any) => {
    setThread((prev: any) => {
      if (!prev || prev.ticket.id !== row.ticket_id) return prev;
      if (prev.messages.some((m: any) => m.id === row.id)) return prev;
      return { ...prev, messages: [...prev.messages, row] };
    });
    if (activeId) markRead({ data: { id: activeId } }).catch(() => {});
  }, [activeId, markRead]);
  useTicketRealtime(activeId, onRealtimeInsert);

  useEffect(() => { refreshList(); /* eslint-disable-next-line */ }, []);

  async function submitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    setBusy(true);
    try {
      await send({ data: { id: activeId, body: reply } });
      setReply("");
      await openTicket(activeId);
      await refreshList();
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  async function changeStatus(s: "open" | "in_progress" | "resolved" | "closed") {
    if (!activeId) return;
    try {
      await setStatus({ data: { id: activeId, status: s } });
      toast.success(`Marked ${s.replace("_", " ")}`);
      await openTicket(activeId);
      await refreshList();
    } catch (err: any) { toast.error(err.message); }
  }

  if (activeId && thread) {
    const t = thread.ticket;
    return (
      <div className="px-4 pt-24 pb-28 max-w-3xl mx-auto">
        <button onClick={() => { setActiveId(null); setThread(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="size-4" /> Back to tickets
        </button>
        <div className="glass-strong rounded-3xl p-5 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Seller ticket #{t.id.slice(0, 8)}</p>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">{t.subject}</h1>
              {t.order_id && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">Order: {t.order_id.slice(0, 8)}</p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-mono ${STATUS_TONE[t.status]}`}>
              {t.status.replace("_", " ")}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-1">
            {(["open", "in_progress", "resolved", "closed"] as const).map((s) => (
              <button key={s} onClick={() => changeStatus(s)} disabled={t.status === s}
                className={`px-3 py-1 rounded-full text-[11px] font-mono uppercase ${
                  t.status === s ? "bg-aurora text-background font-bold" : "glass hover:glass-strong text-muted-foreground"
                }`}
              >
                {s.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {thread.messages.map((m: any) => {
            const role = m.sender_role || (m.is_admin ? "admin" : "user");
            const mine = role === "seller";
            const label = role === "seller" ? "You (Seller)" : role === "admin" ? "Support Agent" : "Customer";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${mine ? "bg-aurora text-background" : "glass-strong"}`}>
                  <p className="text-[10px] uppercase font-mono opacity-70">{label}</p>
                  <p className="text-sm whitespace-pre-wrap mt-1 break-words">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">{new Date(m.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={submitReply} className="glass-strong rounded-2xl p-3 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply to customer…" className="flex-1 bg-transparent outline-none text-sm px-2 min-w-0" />
          <button disabled={busy || !reply.trim()} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-50 inline-flex items-center gap-1 shrink-0">
            <Send className="size-3.5" /> Send
          </button>
        </form>
        <SellerNav />
      </div>
    );
  }

  return (
    <div className="px-4 pt-24 pb-28 max-w-5xl mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-cyan font-mono">Seller</p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Support inbox</h1>
        <p className="text-sm text-muted-foreground mt-1">{tickets.length} ticket{tickets.length === 1 ? "" : "s"} linked to your orders</p>
      </header>
      {tickets.length === 0 ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <LifeBuoy className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No tickets yet. Customers can raise tickets from their order page.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
              onClick={() => openTicket(t.id)}
              className="w-full glass hover:glass-strong rounded-2xl p-4 flex items-center gap-3 text-left transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  #{t.id.slice(0, 8)} · {t.profiles?.display_name ?? "customer"} · {new Date(t.updated_at).toLocaleDateString()}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono shrink-0 ${STATUS_TONE[t.status]}`}>
                {t.status.replace("_", " ")}
              </span>
            </motion.button>
          ))}
        </div>
      )}
      <SellerNav />
    </div>
  );
}
