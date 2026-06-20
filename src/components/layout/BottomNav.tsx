import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart-store";


const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/shop", icon: Search, label: "Shop" },
  { to: "/dashboard", icon: User, label: "Me" },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const openCart = useCart((s) => s.openCart);
  const count = useCart((s) => s.count());

  return (
    <nav aria-label="Primary mobile navigation" className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md">
      <div className="glass-strong shadow-elevated rounded-2xl h-16 flex items-center justify-around px-2">
        {items.map((it) => {
          const active = pathname === it.to || (it.to !== "/" && pathname.startsWith(it.to));
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              aria-current={active ? "page" : undefined}
              aria-label={it.label}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 min-h-11 min-w-11 rounded-xl transition-all ${
                active ? "text-cyan" : "text-muted-foreground"
              }`}
            >
              <Icon className="size-5" aria-hidden="true" />
              <span className="text-[10px] font-medium">{it.label}</span>
            </Link>
          );
        })}
        <button
          onClick={openCart}
          aria-label={`Open cart${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
          className="relative flex flex-col items-center gap-0.5 px-4 py-2 min-h-11 min-w-11 rounded-xl text-muted-foreground"
        >
          <ShoppingBag className="size-5" aria-hidden="true" />
          <span className="text-[10px] font-medium">Cart</span>
          {count > 0 && (
            <span aria-hidden="true" className="absolute top-1 right-2 min-w-[16px] h-[16px] px-1 rounded-full bg-aurora text-[9px] font-bold grid place-items-center text-background">
              {count}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}
