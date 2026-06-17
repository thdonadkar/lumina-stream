// Lightweight client-side auth + role hook.
// Reads the live Supabase session and the caller's role from public.user_roles.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "user" | "seller" | "admin";

export type AuthState = {
  userId: string | null;
  email: string | null;
  loading: boolean;
  roles: AppRole[];
  isAdmin: boolean;
  isSeller: boolean;
};

export function useAuth(): AuthState {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Synchronous subscriber first to avoid missed events.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (!session) {
        setRoles([]);
        setLoading(false);
      }
    });

    // Then hydrate initial session.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return {
    userId,
    email,
    loading,
    roles,
    isAdmin: roles.includes("admin"),
    isSeller: roles.includes("seller"),
  };
}
