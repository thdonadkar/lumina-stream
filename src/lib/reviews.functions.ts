import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

export const listProductReviews = createServerFn({ method: "GET" })
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = publicClient();
    const { data: rows, error } = await supabase
      .from("product_reviews")
      .select("id, product_id, user_id, rating, title, body, created_at")
      .eq("product_id", data.productId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let names: Record<string, string> = {};
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, display_name").in("id", userIds);
      names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name]));
    }
    return (rows ?? []).map((r) => ({ ...r, author: names[r.user_id] ?? "Customer" }));
  });

export const upsertProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; rating: number; title?: string; body?: string }) => {
    if (!d.productId) throw new UserError("Product required");
    if (!d.rating || d.rating < 1 || d.rating > 5) throw new UserError("Rating must be 1-5");
    if (d.title && d.title.length > 120) throw new UserError("Title too long");
    if (d.body && d.body.length > 2000) throw new UserError("Review too long");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("product_reviews")
      .upsert({
        product_id: data.productId,
        user_id: userId,
        rating: data.rating,
        title: data.title ?? null,
        body: data.body ?? null,
      }, { onConflict: "product_id,user_id" })
      .select()
      .single();
    if (error) throw error;
    return row;
  });

export const deleteProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("product_reviews").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });
