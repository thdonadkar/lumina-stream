import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { LifeBuoy, Send, ChevronLeft, MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useTicketRealtime } from "@/hooks/use-ticket-realtime";
import { relativeTimeShort, senderLabel } from "@/lib/support-format";
import { createTicket, listMyTickets, getTicketThread, replyToTicket, markTicketRead } from "@/lib/support.functions";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — Neural" }] }),
  component: Support,
});

const STATUS_TONE: Record<string, string> = {
  open: "text-amber-300 bg-amber-300/10",
  in_progress: "text-cyan bg-cyan/10",
  resolved: "text-emerald-300 bg-emerald-300/10",
  closed: "text-muted-foreground bg-white/5",
};

function Support() {
  const { userId, loading } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const fetchList = useServerFn(listMyTickets);
  const fetchThread = useServerFn(getTicketThread);
  const create = useServerFn(createTicket);
  const send = useServerFn(replyToTicket);

  async function refreshList() {
    try { setTickets(await fetchList()); } catch { /* */ }
  }
  async function openTicket(id: string) {
    setActiveId(id);
    setThread(null);
    try { setThread(await fetchThread({ data: { id } })); } catch { /* */ }
  }

  useEffect(() => { if (userId) refreshList(); /* eslint-disable-next-line */ }, [userId]);

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!userId) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to access support</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Sign in
        </Link>
      </div>
    );
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const t = await create({ data: { subject, message } });
      toast.success("Ticket created");
      setSubject(""); setMessage(""); setCreating(false);
      await refreshList();
      openTicket(t.id);
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

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

  if (activeId && thread) {
    const t = thread.ticket;
    const closed = t.status === "closed" || t.status === "resolved";
    return (
      <div className="px-4 sm:px-6 max-w-3xl mx-auto pb-24">
        <button onClick={() => { setActiveId(null); setThread(null); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="size-4" /> Back to tickets
        </button>
        <div className="glass-strong rounded-3xl p-6 mb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Ticket #{t.id.slice(0, 8)}</p>
              <h1 className="text-2xl font-extrabold tracking-tight">{t.subject}</h1>
              <p className="text-xs text-muted-foreground mt-1">Opened {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-mono ${STATUS_TONE[t.status]}`}>
              {t.status.replace("_", " ")}
            </span>
          </div>
        </div>
        <div className="space-y-3 mb-4">
          {thread.messages.map((m: any) => {
            const role = m.sender_role || (m.is_admin ? "admin" : "user");
            const mine = role === "user";
            const label = role === "admin" ? "Support Agent" : role === "seller" ? "Seller" : "You";
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
        {closed ? (
          <p className="text-xs text-muted-foreground text-center py-4">This ticket is {t.status.replace("_", " ")}. Open a new one if you need more help.</p>
        ) : (
          <form onSubmit={submitReply} className="glass-strong rounded-2xl p-3 flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" className="flex-1 bg-transparent outline-none text-sm px-2" />
            <button disabled={busy || !reply.trim()} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-50 inline-flex items-center gap-1">
              <Send className="size-3.5" /> Send
            </button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 max-w-4xl mx-auto pb-24">
      <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Support</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">How can we help?</h1>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="rounded-full px-4 py-2 text-sm font-bold bg-aurora text-background inline-flex items-center gap-1">
          <Plus className="size-4" /> New ticket
        </button>
      </header>

      {creating && (
        <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={submitNew} className="glass-strong rounded-3xl p-5 mb-6 space-y-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            required
            maxLength={200}
            className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail…"
            required
            maxLength={4000}
            rows={5}
            className="w-full glass rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-cyan resize-y"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreating(false)} className="rounded-full px-4 py-1.5 text-xs glass">Cancel</button>
            <button disabled={busy} className="rounded-full px-4 py-1.5 text-xs font-bold bg-aurora text-background disabled:opacity-50">
              {busy ? "Submitting…" : "Submit ticket"}
            </button>
          </div>
        </motion.form>
      )}

      {tickets.length === 0 ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <LifeBuoy className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">No tickets yet.</p>
          <button onClick={() => setCreating(true)} className="mt-4 px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
            Open your first ticket
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => openTicket(t.id)}
              className="w-full glass hover:glass-strong rounded-2xl p-4 flex items-center gap-4 text-left transition-all"
            >
              <MessageCircle className="size-5 text-cyan shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{t.subject}</p>
                <p className="text-xs text-muted-foreground font-mono">#{t.id.slice(0, 8)} · {new Date(t.updated_at).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-mono ${STATUS_TONE[t.status]}`}>
                {t.status.replace("_", " ")}
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
