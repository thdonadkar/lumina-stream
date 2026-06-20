import { createServerFn } from "@tanstack/react-start";
import { UserError } from "@/lib/user-error";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProductInput = {
  title: string;
  tagline?: string | null;
  description?: string | null;
  price: number;
  original_price?: number | null;
  discount_percent?: number | null;
  stock: number;
  category_slug?: string | null;
  images: string[];
  badge?: string | null;
  status?: "draft" | "active" | "pending";
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

export const createProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProductInput) => {
    if (!d.title?.trim()) throw new UserError("Title required");
    if (typeof d.price !== "number" || d.price < 0) throw new UserError("Valid price required");
    if (typeof d.stock !== "number" || d.stock < 0) throw new UserError("Valid stock required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let categoryId: string | null = null;
    if (data.category_slug) {
      const { data: cat } = await supabase.from("categories").select("id").eq("slug", data.category_slug).maybeSingle();
      categoryId = cat?.id ?? null;
    }
    const { data: row, error } = await (supabase as any).from("products").insert({
      seller_id: userId,
      category_id: categoryId,
      slug: slugify(data.title),
      title: data.title,
      tagline: data.tagline ?? null,
      description: data.description ?? null,
      price: data.price,
      original_price: data.original_price ?? null,
      discount_percent: data.discount_percent ?? 0,
      stock: data.stock,
      images: data.images ?? [],
      badge: data.badge ?? null,
      status: data.status ?? "pending",
    }).select().single();
    if (error) throw error;
    return row;
  });

export const listMyProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("products")
      .select("id,seller_id,category_id,slug,title,tagline,description,price,original_price,discount_percent,stock,images,rating,review_count,status,accent,badge,created_at,updated_at")
      .eq("seller_id", userId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const listMyArchivedProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("products")
      .select("id,seller_id,category_id,slug,title,tagline,description,price,original_price,discount_percent,stock,images,rating,review_count,status,accent,badge,created_at,updated_at")
      .eq("seller_id", userId)
      .eq("status", "archived")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const restoreMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("products").select("seller_id,status").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Product not found");
    if ((existing as any).seller_id !== userId) throw new UserError("Forbidden");
    if ((existing as any).status !== "archived") throw new UserError("Only archived products can be restored");

    const { error: upErr } = await (supabase as any)
      .from("products").update({ status: "active" }).eq("id", data.id);
    if (upErr) throw upErr;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId, action: "product.restore",
      target_table: "products", target_id: data.id,
      metadata: { from_status: "archived", to_status: "active" },
    });
    return { ok: true };
  });

export const deleteMyProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("products").select("seller_id,status").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Product not found");
    if ((existing as any).seller_id !== userId) throw new UserError("Forbidden");

    // Block delete/archive if any order_items reference this product with an
    // active (not finalized) order status.
    const { data: activeItems, error: oiErr } = await (supabase as any)
      .from("order_items")
      .select("id, order_id, orders!inner(status)")
      .eq("product_id", data.id)
      .not("orders.status", "in", "(delivered,cancelled,returned,refunded)")
      .limit(1);
    if (oiErr) throw oiErr;
    const hasActive = (activeItems ?? []).length > 0;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (hasActive) {
      // Soft-delete: archive so historical orders can still resolve title/image,
      // but the product disappears from the seller catalog and shop listings.
      const { error: upErr } = await (supabase as any)
        .from("products").update({ status: "archived" }).eq("id", data.id);
      if (upErr) throw upErr;
      await supabaseAdmin.from("audit_log").insert({
        actor_id: userId, action: "product.archive",
        target_table: "products", target_id: data.id,
        metadata: { reason: "active_orders_present" },
      });
      return { ok: true, archived: true };
    }

    // No active orders — also archive (soft-delete) for audit consistency and
    // to keep any historical references safe.
    const { error: upErr } = await (supabase as any)
      .from("products").update({ status: "archived" }).eq("id", data.id);
    if (upErr) throw upErr;
    await supabaseAdmin.from("audit_log").insert({
      actor_id: userId, action: "product.archive",
      target_table: "products", target_id: data.id,
      metadata: { reason: "seller_delete" },
    });
    return { ok: true, archived: true };
  });

export const getMyProduct = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("products")
      .select("id,seller_id,category_id,slug,title,tagline,description,price,original_price,discount_percent,stock,images,rating,review_count,status,accent,badge,created_at,updated_at,categories:category_id(slug)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    if (!row) throw new UserError("Product not found");
    if ((row as any).seller_id !== userId) throw new UserError("Forbidden");
    return row;
  });

export type ProductUpdate = Partial<Omit<ProductInput, "status">> & { id: string; status?: ProductInput["status"] };

export const updateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProductUpdate) => {
    if (!d.id) throw new UserError("Product id required");
    if (d.title !== undefined && !d.title.trim()) throw new UserError("Title required");
    if (d.price !== undefined && (typeof d.price !== "number" || d.price < 0)) throw new UserError("Valid price required");
    if (d.stock !== undefined && (typeof d.stock !== "number" || d.stock < 0)) throw new UserError("Valid stock required");
    return d;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("products").select("seller_id").eq("id", data.id).maybeSingle();
    if (!existing) throw new UserError("Product not found");
    if ((existing as any).seller_id !== userId) throw new UserError("Forbidden");

    let categoryId: string | undefined;
    if (data.category_slug !== undefined) {
      if (data.category_slug) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", data.category_slug).maybeSingle();
        categoryId = cat?.id ?? undefined;
      } else {
        categoryId = undefined;
      }
    }

    const patch: any = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.tagline !== undefined) patch.tagline = data.tagline;
    if (data.description !== undefined) patch.description = data.description;
    if (data.price !== undefined) patch.price = data.price;
    if (data.original_price !== undefined) patch.original_price = data.original_price;
    if (data.discount_percent !== undefined) patch.discount_percent = data.discount_percent;
    if (data.stock !== undefined) patch.stock = data.stock;
    if (data.images !== undefined) patch.images = data.images;
    if (data.badge !== undefined) patch.badge = data.badge;
    if (data.status !== undefined) patch.status = data.status;
    if (categoryId !== undefined) patch.category_id = categoryId;

    const { data: row, error } = await (supabase as any)
      .from("products").update(patch).eq("id", data.id).select().single();
    if (error) throw error;
    return row;
  });
