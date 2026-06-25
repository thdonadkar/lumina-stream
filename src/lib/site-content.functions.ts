import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { UserError } from "@/lib/user-error";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const { data, error } = await (sb as any)
    .from("site_content")
    .select("key,value,updated_at")
    .order("key", { ascending: true });
  if (error) throw error;
  return (data ?? []) as { key: string; value: any; updated_at: string }[];
});

export const getSiteContent = createServerFn({ method: "GET" })
  .inputValidator((d: { key: string }) => {
    if (!d?.key || typeof d.key !== "string") throw new UserError("key required");
    return d;
  })
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: row, error } = await (sb as any)
      .from("site_content")
      .select("key,value")
      .eq("key", data.key)
      .maybeSingle();
    if (error) throw error;
    return row as { key: string; value: any } | null;
  });

export const upsertSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string; value: any }) => {
    if (!d?.key?.trim() || d.key.length > 64) throw new UserError("Key required (max 64 chars)");
    if (!/^[a-z0-9_\-\.]+$/i.test(d.key)) throw new UserError("Key may contain letters, numbers, _ - . only");
    if (d.value === undefined) throw new UserError("Value required");
    return { key: d.key.trim(), value: d.value };
  })
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const { data: row, error } = await (context.supabase as any)
      .from("site_content")
      .upsert(
        { key: data.key, value: data.value, updated_by: context.userId },
        { onConflict: "key" },
      )
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { key: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const { error } = await (context.supabase as any)
      .from("site_content")
      .delete()
      .eq("key", data.key);
    if (error) throw error;
    return { ok: true };
  });
