import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Search, ShoppingBag, User, Mic } from "lucide-react";
import { useCart } from "@/lib/cart-store";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/dashboard", label: "Account" },
];

export function Navbar() {
  const count = useCart((s) => s.count());
  const openCart = useCart((s) => s.openCart);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 sm:top-5 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-6xl"
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
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group">
            <Search className="size-3.5" />
            <span className="font-mono uppercase tracking-wider">Search</span>
            <Mic className="size-3.5 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

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
            to="/auth"
            className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all"
            aria-label="Account"
          >
            <User className="size-4" />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
