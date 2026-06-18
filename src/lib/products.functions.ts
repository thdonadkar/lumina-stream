import { createServerFn } from "@tanstack/react-start";
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
    if (!d.title?.trim()) throw new Error("Title required");
    if (typeof d.price !== "number" || d.price < 0) throw new Error("Valid price required");
    if (typeof d.stock !== "number" || d.stock < 0) throw new Error("Valid stock required");
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
