import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCheck, Package, Tag, Info } from "lucide-react";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/notifications.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Notif = Awaited<ReturnType<typeof listNotifications>>[number];

const ICON: Record<string, typeof Bell> = { order: Package, offer: Tag, system: Info };

export function NotificationBell() {
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const fetchList = useServerFn(listNotifications);
  const markOne = useServerFn(markNotificationRead);
  const markAll = useServerFn(markAllNotificationsRead);

  async function refresh() {
    if (!userId) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    try {
      setItems(await fetchList());
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    refresh();
    if (!userId) return;
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return null;
  const unread = items.filter((n) => !n.is_read).length;

  async function onMarkOne(id: string) {
    await markOne({ data: { id } });
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, is_read: true } : x)));
  }
  async function onMarkAll() {
    await markAll();
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-aurora animate-aurora text-[10px] font-bold grid place-items-center text-background">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 mt-2 w-[340px] max-w-[92vw] glass-strong shadow-elevated rounded-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-3 border-b border-white/5">
                <p className="text-sm font-bold">Notifications</p>
                {unread > 0 && (
                  <button
                    onClick={onMarkAll}
                    className="text-[11px] text-cyan inline-flex items-center gap-1 hover:opacity-80"
                  >
                    <CheckCheck className="size-3.5" /> Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] overflow-auto">
                {items.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">No notifications yet.</p>
                ) : (
                  items.map((n) => {
                    const Icon = ICON[n.type] ?? Info;
                    const Inner = (
                      <div
                        className={`flex gap-3 p-3 hover:bg-white/[0.03] transition-colors ${
                          n.is_read ? "opacity-60" : ""
                        }`}
                      >
                        <div className="size-8 rounded-full bg-aurora animate-aurora grid place-items-center text-background shrink-0">
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold truncate">{n.title}</p>
                            {!n.is_read && <span className="size-2 rounded-full bg-cyan shrink-0" />}
                          </div>
                          {n.body && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                          )}
                          <p className="text-[10px] font-mono text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                    const handleClick = () => {
                      if (!n.is_read) onMarkOne(n.id);
                      setOpen(false);
                    };
                    return n.link ? (
                      <Link key={n.id} to={n.link} onClick={handleClick} className="block border-b border-white/5 last:border-0">
                        {Inner}
                      </Link>
                    ) : (
                      <button
                        key={n.id}
                        onClick={handleClick}
                        className="w-full text-left border-b border-white/5 last:border-0"
                      >
                        {Inner}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-2 border-t border-white/5 text-center">
                <Link to="/dashboard" onClick={() => setOpen(false)} className="text-[11px] text-muted-foreground hover:text-foreground">
                  View account →
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
