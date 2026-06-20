import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, User, Mic, Heart, ChevronDown, ShieldAlert, Store, LogOut, LifeBuoy, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/categories";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
];

export function Navbar() {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.openCart);
  const wishCount = useWishlist((s) => s.count());
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, isSeller, userId } = useAuth();
  const navigate = useNavigate();
  const [catsOpen, setCatsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Hydration guard: persisted Zustand stores (cart/wishlist) only have data
  // on the client. Render the empty state on first paint to match SSR, then
  // swap in the real counts after mount to avoid hydration mismatches.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  const cartBadge = hydrated ? count : 0;
  const wishBadge = hydrated ? wishCount : 0;

  // close mobile menu on route change + ESC
  useEffect(() => {
    setMobileOpen(false);
    setCatsOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl"
      onMouseLeave={() => setCatsOpen(false)}
    >
      <div className="glass-strong shadow-elevated rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="size-7 rounded-md bg-aurora animate-aurora animate-pulse-glow grid place-items-center">
            <div className="size-3 rounded-sm bg-background" />
          </div>
          <span className="font-extrabold tracking-tighter text-base sm:text-lg">NEURAL.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => {
            const active = pathname === l.to || (l.to !== "/" && pathname.startsWith(l.to));
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`relative px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-glass-strong ring-1 ring-white/10"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative">{l.label}</span>
              </Link>
            );
          })}

          {/* Categories trigger */}
          <button
            onMouseEnter={() => setCatsOpen(true)}
            onClick={() => setCatsOpen((v) => !v)}
            className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors flex items-center gap-1 ${
              pathname.startsWith("/category") ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Categories <ChevronDown className={`size-3.5 transition-transform ${catsOpen ? "rotate-180" : ""}`} />
          </button>

          <Link to="/dashboard" className="px-4 py-1.5 text-sm font-medium rounded-full text-muted-foreground hover:text-foreground">
            Account
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden grid place-items-center size-9 rounded-full glass hover:glass-strong"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>

          {isSeller && (
            <Link to="/seller/dashboard" title="Seller console" className="hidden sm:grid place-items-center size-9 rounded-full glass hover:glass-strong">
              <Store className="size-4 text-cyan" />
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/dashboard" title="Admin" className="hidden sm:grid place-items-center size-9 rounded-full glass hover:glass-strong">
              <ShieldAlert className="size-4 text-rose-400" />
            </Link>
          )}

          <Link
            to="/search"
            className="hidden sm:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
          >
            <Search className="size-3.5" />
            <span className="font-mono uppercase tracking-wider">Search</span>
            <Mic className="size-3.5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>

          <Link
            to="/wishlist"
            className="relative grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Wishlist"
          >
            <Heart className={`size-4 ${wishCount > 0 ? "fill-rose-400 text-rose-400" : ""}`} />
            {wishCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-400 text-[10px] font-bold grid place-items-center text-background">
                {wishCount}
              </span>
            )}
          </Link>

          <NotificationBell />

          <button
            onClick={openCart}
            className="relative grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Open cart"
          >
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-aurora animate-aurora text-[10px] font-bold grid place-items-center text-background"
              >
                {count}
              </motion.span>
            )}
          </button>

          <Link
            to="/support"
            className="hidden sm:grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Support"
            title="Support"
          >
            <LifeBuoy className="size-4" />
          </Link>

          <Link
            to={userId ? "/dashboard" : "/auth"}
            className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Account"
          >
            <User className="size-4" />
          </Link>

          {userId && (
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              title="Sign out"
              className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all text-muted-foreground hover:text-rose-400"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mega menu */}
      <AnimatePresence>
        {catsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-2 glass-strong shadow-elevated rounded-2xl p-5 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[70vh] overflow-auto"
          >
            {CATEGORIES.map((c) => {
              const I = c.icon;
              return (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  onClick={() => setCatsOpen(false)}
                  className="glass hover:glass-strong rounded-xl p-3 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="size-8 rounded-lg bg-aurora animate-aurora grid place-items-center text-background">
                      <I className="size-3.5" />
                    </div>
                    <p className="font-bold text-sm">{c.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {c.subs.slice(0, 4).map((s) => s.name).join(" · ")}
                  </p>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-md md:hidden"
              aria-hidden="true"
            />
            <motion.div
              id="mobile-nav-drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed top-0 right-0 bottom-0 z-[90] w-[85%] max-w-sm glass-strong border-l border-white/10 flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/5">
                <span className="font-extrabold tracking-tighter text-lg">NEURAL.</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                  className="size-9 grid place-items-center rounded-full glass hover:glass-strong"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">
                    {l.label}
                  </Link>
                ))}
                <Link to="/search" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Search</Link>
                <Link to="/wishlist" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">
                  Wishlist {wishCount > 0 && <span className="ml-1 text-xs text-rose-400">({wishCount})</span>}
                </Link>
                <Link to="/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Account</Link>
                <Link to="/support" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Support</Link>
                {isSeller && (
                  <Link to="/seller/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold text-cyan">
                    Seller console
                  </Link>
                )}
                {isAdmin && (
                  <Link to="/admin/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold text-rose-400">
                    Admin
                  </Link>
                )}

                <div className="pt-4">
                  <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Categories</p>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map((c) => {
                      const I = c.icon;
                      return (
                        <Link
                          key={c.slug}
                          to="/category/$slug"
                          params={{ slug: c.slug }}
                          className="glass hover:glass-strong rounded-xl p-3 flex items-center gap-2"
                        >
                          <div className="size-7 rounded-lg bg-aurora animate-aurora grid place-items-center text-background shrink-0">
                            <I className="size-3.5" />
                          </div>
                          <span className="text-sm font-semibold truncate">{c.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {userId ? (
                  <button
                    onClick={handleLogout}
                    className="w-full mt-4 px-4 py-3 rounded-xl glass hover:glass-strong font-semibold text-rose-400 text-left flex items-center gap-2"
                  >
                    <LogOut className="size-4" aria-hidden="true" /> Sign out
                  </button>
                ) : (
                  <Link to="/auth" className="block mt-4 px-4 py-3 rounded-xl bg-aurora animate-aurora font-bold text-background text-center">
                    Sign in
                  </Link>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
