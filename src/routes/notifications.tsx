import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Bell, CheckCheck, Package, Tag, Info, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useNotificationsRealtime } from "@/hooks/use-notifications-realtime";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications.functions";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Neural" }] }),
  component: NotificationsPage,
});

const ICON: Record<string, typeof Bell> = { order: Package, offer: Tag, system: Info };

function NotificationsPage() {
  const { userId, loading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const fetchList = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  async function refresh() {
    try { setItems(await fetchList()); } catch { /* */ }
  }
  useEffect(() => { if (userId) refresh(); /* eslint-disable-next-line */ }, [userId]);
  useNotificationsRealtime(userId ?? null, () => refresh());

  if (loading) return <div className="p-20 text-center text-muted-foreground">Loading…</div>;
  if (!userId) {
    return (
      <div className="p-20 text-center">
        <h1 className="text-3xl font-bold">Sign in to view notifications</h1>
        <Link to="/auth" className="mt-6 inline-block px-6 py-3 rounded-full bg-aurora text-background font-bold">Sign in</Link>
      </div>
    );
  }

  const filtered = filter === "unread" ? items.filter((n) => !n.is_read) : items;
  const unread = items.filter((n) => !n.is_read).length;

  async function onMarkOne(id: string) {
    try {
      await markOne({ data: { id } });
      setItems((xs) => xs.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
    } catch { toast.error("Couldn't mark as read"); }
  }
  async function onMarkAll() {
    try {
      await markAll();
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
