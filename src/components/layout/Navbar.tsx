import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, User, Heart, ChevronDown, ShieldAlert, Store, LogOut, LifeBuoy, Menu, X, Package, MapPin, BarChart3, Users as UsersIcon, Image as ImageIcon, FileText, Undo2, LayoutDashboard, PlusSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/lib/cart-store";
import { useWishlist } from "@/lib/wishlist-store";
import { useAuth } from "@/hooks/use-auth";
import { CATEGORIES } from "@/lib/categories";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeManager";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const brandLogo = { url: "/atomspot-logo.png" };


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
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
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
      <div className="glass-strong shadow-elevated rounded-2xl px-2.5 sm:px-6 py-2 sm:py-3 flex flex-nowrap items-center justify-between gap-1 sm:gap-4">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 mr-1">
          <div className="size-8 sm:size-9 rounded-lg bg-white grid place-items-center p-1 shadow-glow-cyan shrink-0">
            <img src={brandLogo.url} alt="AtomSpot" className="size-full object-contain" />
          </div>
          <span className="hidden sm:inline font-extrabold tracking-tighter text-base sm:text-lg">ATOMSPOT.</span>
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
            onClick={() => setCatsOpen((v) => !v)}

            onFocus={() => setCatsOpen(true)}
            aria-expanded={catsOpen}
            aria-haspopup="true"
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

        <div className="flex flex-nowrap items-center gap-1 sm:gap-2 shrink-0">
          {isSeller && (
            <Link to="/seller/dashboard" title="Seller console" aria-label="Seller console" className="hidden md:grid place-items-center size-9 rounded-full glass hover:glass-strong shrink-0">
              <Store className="size-4 text-cyan" />
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/dashboard" title="Admin" aria-label="Admin" className="hidden md:grid place-items-center size-9 rounded-full glass hover:glass-strong shrink-0">
              <ShieldAlert className="size-4 text-rose-400" />
            </Link>
          )}

          <Link
            to="/search"
            className="hidden md:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Search className="size-3.5" />
            <span className="font-mono uppercase tracking-wider">Search</span>
          </Link>

          {/* Mobile-only search icon */}
          <Link
            to="/search"
            className="md:hidden grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0"
            aria-label="Search"
          >
            <Search className="size-4" />
          </Link>

          <Link
            to="/wishlist"
            className="hidden md:grid relative place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0"
            aria-label="Wishlist"
          >
            <Heart className={`size-4 ${wishBadge > 0 ? "fill-rose-400 text-rose-400" : ""}`} />
            {wishBadge > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-400 text-[10px] font-bold grid place-items-center text-background tabular-nums">
                {wishBadge > 99 ? "99+" : wishBadge}
              </span>
            )}
          </Link>

          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          <div className="shrink-0">
            <NotificationBell />
          </div>

          <button
            onClick={openCart}
            className="relative grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0"
            aria-label={`Open cart${cartBadge > 0 ? `, ${cartBadge} item${cartBadge === 1 ? "" : "s"}` : ""}`}
          >
            <ShoppingBag className="size-4" />
            {cartBadge > 0 && (
              <motion.span
                key={cartBadge}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 rounded-full bg-aurora animate-aurora text-[10px] font-bold grid place-items-center text-background tabular-nums"
              >
                {cartBadge > 99 ? "99+" : cartBadge}
              </motion.span>
            )}
          </button>

          <Link
            to="/support"
            className="hidden md:grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0"
            aria-label="Support"
            title="Support"
          >
            <LifeBuoy className="size-4" />
          </Link>

          {userId ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <User className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 glass-strong border-white/10">
                <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><User className="size-4" /> Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard"><Package className="size-4" /> Orders</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/wishlist"><Heart className="size-4" /> Wishlist</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/addresses"><MapPin className="size-4" /> Addresses</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/support"><LifeBuoy className="size-4" /> Support</Link>
                </DropdownMenuItem>

                {isSeller && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-cyan">
                      Seller
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/dashboard"><LayoutDashboard className="size-4" /> Seller Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/products"><Package className="size-4" /> My Products</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/add-product"><PlusSquare className="size-4" /> Add Product</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/orders"><ShoppingBag className="size-4" /> Seller Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/analytics"><BarChart3 className="size-4" /> Analytics</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/seller/support"><LifeBuoy className="size-4" /> Seller Support</Link>
                    </DropdownMenuItem>
                  </>
                )}

                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-rose-400">
                      Admin
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/dashboard"><LayoutDashboard className="size-4" /> Admin Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/users"><UsersIcon className="size-4" /> Users</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/sellers"><Store className="size-4" /> Sellers</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/products"><Package className="size-4" /> Products</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/orders"><ShoppingBag className="size-4" /> Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/categories"><FileText className="size-4" /> Categories</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/returns"><Undo2 className="size-4" /> Returns</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/banners"><ImageIcon className="size-4" /> Banners</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/content"><FileText className="size-4" /> CMS / Content</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/support"><LifeBuoy className="size-4" /> Support</Link>
                    </DropdownMenuItem>
                  </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-rose-400 focus:text-rose-400">
                  <LogOut className="size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              to="/auth"
              className="grid place-items-center size-9 rounded-full glass hover:glass-strong transition-all shrink-0"
              aria-label="Sign in"
            >
              <User className="size-4" />
            </Link>
          )}

          {/* Mobile hamburger — moved to end (right side) */}
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden grid place-items-center size-9 rounded-full glass hover:glass-strong shrink-0"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu className="size-4" aria-hidden="true" />
          </button>
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

      {/* Mobile drawer — portaled to body so it isn't trapped by the header's transform containing block */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm md:hidden"
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
                className="fixed top-0 right-0 bottom-0 z-[90] w-[92%] max-w-sm glass-strong border-l border-white/10 flex flex-col md:hidden"
              >
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <span className="font-extrabold tracking-tighter text-lg">ATOMSPOT.</span>
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
                    Wishlist {wishBadge > 0 && <span className="ml-1 text-xs text-rose-400">({wishBadge})</span>}
                  </Link>
                  <Link to="/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Account</Link>
                  <Link to="/support" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Support</Link>
                  <ThemeToggle variant="row" />
                  <Link to="/addresses" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Addresses</Link>

                  {isSeller && (
                    <div className="pt-3">
                      <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-cyan">Seller</p>
                      <div className="space-y-1">
                        <Link to="/seller/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Seller Dashboard</Link>
                        <Link to="/seller/products" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">My Products</Link>
                        <Link to="/seller/add-product" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Add Product</Link>
                        <Link to="/seller/orders" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Seller Orders</Link>
                        <Link to="/seller/analytics" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Analytics</Link>
                        <Link to="/seller/support" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Seller Support</Link>
                      </div>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="pt-3">
                      <p className="px-4 pb-2 text-[10px] font-mono uppercase tracking-widest text-rose-400">Admin</p>
                      <div className="space-y-1">
                        <Link to="/admin/dashboard" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Admin Dashboard</Link>
                        <Link to="/admin/users" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Users</Link>
                        <Link to="/admin/sellers" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Sellers</Link>
                        <Link to="/admin/products" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Products</Link>
                        <Link to="/admin/orders" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Orders</Link>
                        <Link to="/admin/categories" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Categories</Link>
                        <Link to="/admin/returns" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Returns</Link>
                        <Link to="/admin/banners" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Banners</Link>
                        <Link to="/admin/content" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">CMS / Content</Link>
                        <Link to="/admin/support" className="block px-4 py-3 rounded-xl glass hover:glass-strong font-semibold">Support</Link>
                      </div>
                    </div>
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
        </AnimatePresence>,
        document.body,
      )}
    </motion.header>
  );
}
