import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "./CartDrawer";
import { Toaster } from "@/components/ui/sonner";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen relative overflow-x-hidden">
      <Navbar />
      <main className="pt-24 pb-28 md:pb-12">{children}</main>
      <BottomNav />
      <CartDrawer />
      <Toaster position="bottom-right" offset={16} />

    </div>
  );
}
