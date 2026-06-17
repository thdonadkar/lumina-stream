import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, User, Mic, Heart, ChevronDown, ShieldAlert, Store } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/categories";

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
  const [catsOpen, setCatsOpen] = useState(false);

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
            to={userId ? "/dashboard" : "/auth"}
            className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Account"
          >
            <User className="size-4" />
          </Link>
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
                  <div className="flex flex-wrap gap-1">
                    {c.subs.slice(0, 4).map((s) => (
                      <span key={s.slug} className="text-[10px] text-muted-foreground">{s.name}</span>
                    )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, <span key={`d${i}`} className="text-[10px] text-muted-foreground/40">·</span>, el] : [el]), [])}
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
