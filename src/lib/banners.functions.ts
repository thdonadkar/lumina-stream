import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export type BannerInput = {
  id?: string;
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  cta_text?: string | null;
  cta_link?: string | null;
  position?: number;
  active?: boolean;
};

export const listActiveBanners = createServerFn({ method: "GET" }).handler(async () => {
  const sb = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
  const { data, error } = await (sb as any)
    .from("banners").select("*").eq("active", true).order("position", { ascending: true });
  if (error) throw error;
  return data ?? [];
});

export const listAllBanners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("banners").select("*").order("position", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });

function validate(d: BannerInput): BannerInput {
  if (!d.title?.trim() || d.title.length > 200) throw new UserError("Title required (max 200 chars)");
  return d;
}

export const saveBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const payload = {
      title: data.title,
      subtitle: data.subtitle ?? null,
      image_url: data.image_url ?? null,
      cta_text: data.cta_text ?? null,
      cta_link: data.cta_link ?? null,
      position: data.position ?? 0,
      active: data.active ?? true,
    };
    if (data.id) {
      const { data: row, error } = await (context.supabase as any)
        .from("banners").update(payload).eq("id", data.id).select().single();
      if (error) throw error; return row;
    }
    const { data: row, error } = await (context.supabase as any)
      .from("banners").insert(payload).select().single();
    if (error) throw error; return row;
  });

export const deleteBanner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "admin",
    });
    if (!isAdmin) throw new UserError("Forbidden");
    const { error } = await (context.supabase as any).from("banners").delete().eq("id", data.id);
    if (error) throw error; return { ok: true };
  });
