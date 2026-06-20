import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type RequiredRole = "admin" | "seller";

/**
 * Use in a top-level route's `beforeLoad` (paired with `ssr: false`)
 * to redirect unauthenticated or under-privileged users BEFORE the
 * protected component renders — eliminates the RoleGate flash.
 */
export async function requireRole(role: RequiredRole) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({
      to: "/auth",
      search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" } as any,
    });
  }
  const { data: ok } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: role });
  if (!ok) {
    throw redirect({ to: "/dashboard" });
  }
}
