import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Package, Tag, Info, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({ meta: [{ title: "Notifications — Neural" }] }),
  component: NotificationsPage,
});

const ICON: Record<string, typeof Bell> = { order: Package, offer: Tag, system: Info };
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

function NotificationsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let active = true;
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      console.log("SESSION:", nextSession);
      setSession(nextSession);
      setSessionLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      console.log("SESSION:", data.session);
      setSession(data.session);
      setSessionLoading(false);
    }).catch((err) => {
      console.error("Session restore error:", err);
      if (!active) return;
      setSession(null);
      setSessionLoading(false);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!session?.user.id) return;
    setFetching(true);
    setError(false);
    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      console.log("NOTIFICATIONS:", data);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setError(true);
      setItems([]);
    } finally {
      setFetching(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) { setItems(null); return; }
    refresh();
  }, [session, sessionLoading, refresh]);
  useNotificationsRealtime(session?.user.id ?? null, refresh);

  if (sessionLoading || (session && fetching && !items && !error)) {
    return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!session) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to view notifications</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">Sign in</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 sm:px-6 max-w-3xl mx-auto pt-20 pb-24 text-center">
        <div className="glass-strong rounded-3xl p-12">
          <Bell className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="font-bold">Unable to load notifications.</p>
          <p className="text-sm text-muted-foreground mt-1">Please try again.</p>
          <button onClick={refresh} className="mt-5 px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!items) {
    return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  }

  const filtered = filter === "unread" ? items.filter((n) => !n.is_read) : items;
  const unread = items.filter((n) => !n.is_read).length;

  async function onMarkOne(id: string) {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", session.user.id);
      if (updateError) throw updateError;
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    } catch { toast.error("Couldn't mark as read"); }
  }
  async function onMarkAll() {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);
      if (updateError) throw updateError;
      setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
      toast.success("All notifications marked as read");
    } catch { toast.error("Couldn't mark all as read"); }
  }

  return (
    <div className="px-4 sm:px-6 max-w-3xl mx-auto pb-24">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ChevronLeft className="size-4" /> Back to account
      </Link>
      <header className="mb-6 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">Inbox</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter">Notifications</h1>
          <p className="text-xs text-muted-foreground mt-1">{unread} unread of {items.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass rounded-full p-1 flex text-xs">
            <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full ${filter === "all" ? "bg-aurora text-background font-bold" : "text-muted-foreground"}`}>All</button>
            <button onClick={() => setFilter("unread")} className={`px-3 py-1 rounded-full ${filter === "unread" ? "bg-aurora text-background font-bold" : "text-muted-foreground"}`}>Unread</button>
          </div>
          {unread > 0 && (
            <button onClick={onMarkAll} className="text-xs text-cyan inline-flex items-center gap-1 hover:opacity-80 px-3 py-1.5 rounded-full glass">
              <CheckCheck className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <Bell className="size-12 mx-auto text-muted-foreground opacity-50 mb-3" />
          <p className="text-muted-foreground">{filter === "unread" ? "No unread notifications." : "No notifications yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n, i) => {
            const Icon = ICON[n.type] ?? Info;
            const Inner = (
              <div className={`glass hover:glass-strong rounded-2xl p-4 flex gap-4 items-start transition-all ${n.is_read ? "opacity-60" : ""}`}>
                <div className="size-10 rounded-full bg-aurora animate-aurora grid place-items-center text-background shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold truncate">{n.title}</p>
                    {!n.is_read && <span className="size-2 rounded-full bg-cyan shrink-0" />}
                  </div>
                  {n.body && <p className="text-sm text-muted-foreground mt-1 break-words">{n.body}</p>}
                  <p className="text-[10px] font-mono text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
            const handleClick = () => { if (!n.is_read) onMarkOne(n.id); };
            return (
              <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                {n.link ? (
                  <Link to={n.link} onClick={handleClick} className="block">{Inner}</Link>
                ) : (
                  <button onClick={handleClick} className="w-full text-left">{Inner}</button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
