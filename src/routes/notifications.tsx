import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { Bell, CheckCheck, ChevronLeft, Info, Package, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({ meta: [{ title: "Notifications — Neural" }] }),
  component: NotificationsPage,
});

type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];
type Filter = "all" | "unread";

const ICON: Record<string, typeof Bell> = { order: Package, offer: Tag, system: Info };

function Loader() {
  return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
}

function NotificationsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!mounted) return;
        if (sessionError) console.error("Session restore error:", sessionError);
        setSession(data.session ?? null);
        setSessionLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Session restore error:", err);
        setSession(null);
        setSessionLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession ?? null);
      setSessionLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    setLoading(true);
    setError(false);

    try {
      const { data, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Notification fetch error:", err);
      setNotifications([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    fetchNotifications();
  }, [fetchNotifications, session?.user?.id, sessionLoading]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel(`notifications-page:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${session.user.id}`,
        },
        () => {
          void fetchNotifications();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, session?.user?.id]);

  if (sessionLoading || loading) return <Loader />;

  if (!session) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to view notifications</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">
          Sign in
        </Link>
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
          <button onClick={fetchNotifications} className="mt-5 px-5 py-2 rounded-full bg-aurora text-background font-bold text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const unread = notifications.filter((n) => !n.is_read).length;
  const filtered = filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications;

  async function markOne(id: string) {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;
      setNotifications((current) => current.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch (err) {
      console.error("Mark notification read error:", err);
      toast.error("Couldn't mark notification as read");
    }
  }

  async function markAll() {
    try {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", session.user.id)
        .eq("is_read", false);

      if (updateError) throw updateError;
      setNotifications((current) => current.map((n) => ({ ...n, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Mark all notifications read error:", err);
      toast.error("Couldn't mark all as read");
    }
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
          <p className="text-xs text-muted-foreground mt-1">{unread} unread of {notifications.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass rounded-full p-1 flex text-xs">
            <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full ${filter === "all" ? "bg-aurora text-background font-bold" : "text-muted-foreground"}`}>All</button>
            <button onClick={() => setFilter("unread")} className={`px-3 py-1 rounded-full ${filter === "unread" ? "bg-aurora text-background font-bold" : "text-muted-foreground"}`}>Unread</button>
          </div>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-cyan inline-flex items-center gap-1 hover:opacity-80 px-3 py-1.5 rounded-full glass">
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
          {filtered.map((notification, index) => {
            const Icon = ICON[notification.type] ?? Info;
            const content = (
              <div className={`glass hover:glass-strong rounded-2xl p-4 flex gap-4 items-start transition-all ${notification.is_read ? "opacity-60" : ""}`}>
                <div className="size-10 rounded-full bg-aurora animate-aurora grid place-items-center text-background shrink-0">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold truncate">{notification.title}</p>
                    {!notification.is_read && <span className="size-2 rounded-full bg-cyan shrink-0" />}
                  </div>
                  {notification.body && <p className="text-sm text-muted-foreground mt-1 break-words">{notification.body}</p>}
                  <p className="text-[10px] font-mono text-muted-foreground mt-2">{new Date(notification.created_at).toLocaleString()}</p>
                </div>
              </div>
            );
            const handleClick = () => {
              if (!notification.is_read) void markOne(notification.id);
            };

            return (
              <motion.div key={notification.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                {notification.link ? (
                  <Link to={notification.link} onClick={handleClick} className="block">{content}</Link>
                ) : (
                  <button onClick={handleClick} className="w-full text-left">{content}</button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}