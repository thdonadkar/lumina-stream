import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Product } from "@/lib/products";

// Server-side publishable Supabase client (anon role, RLS-respected, no auth needed).
// Public SELECT policy on products allows status='active' rows to be read by anon.
function getPublicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  price: number | string;
  original_price: number | string | null;
  stock: number;
  images: string[] | null;
  rating: number | string | null;
  review_count: number;
  accent: string | null;
  badge: string | null;
  category_id: string | null;
};

function categoryFromImages(_: ProductRow): string {
  return "Catalog";
}

/** Map a DB product row to the static Product shape consumed by UI components. */
export function rowToProduct(r: ProductRow, categorySlug?: string | null, categoryName?: string | null): Product {
  const images = (r.images ?? []).filter(Boolean);
  const price = Number(r.price);
  const original = r.original_price != null ? Number(r.original_price) : undefined;
  const rating = r.rating != null ? Number(r.rating) : 4.5;
  const accent = (r.accent === "cyan" || r.accent === "purple" || r.accent === "rose") ? r.accent : "cyan";
  return {
    id: r.slug,                          // route param uses slug
    name: r.title,
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    price,
    originalPrice: original,
    category: categoryName ?? categoryFromImages(r),
    categorySlug: categorySlug ?? "",
    rating,
    reviews: r.review_count ?? 0,
    image: images[0] ?? "",
    gallery: images,
    accent,
    badge: r.badge ?? undefined,
    inStock: (r.stock ?? 0) > 0,
    stock: r.stock ?? 0,
  };
}

/** Public listing of all active products with their category slug + name. */
export const listActiveProducts = createServerFn({ method: "GET" }).handler(async () => {
  const db = getPublicClient();
  const { data, error } = await db
    .from("products")
    .select("id,slug,title,tagline,description,price,original_price,stock,images,rating,review_count,accent,badge,category_id,categories:category_id(slug,name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []).map((r: any) =>
    rowToProduct(r, r.categories?.slug ?? null, r.categories?.name ?? null),
  );
});

/** Fetch a single active product by slug. Returns null if missing. */
export const getActiveProductBySlug = createServerFn({ method: "POST" })
  .inputValidator((d: { slug: string }) => {
    if (!d?.slug || typeof d.slug !== "string") throw new Error("slug required");
    return { slug: d.slug.slice(0, 200) };
  })
  .handler(async ({ data }) => {
    const db = getPublicClient();
    const { data: row, error } = await db
      .from("products")
      .select("id,slug,title,tagline,description,price,original_price,stock,images,rating,review_count,accent,badge,category_id,categories:category_id(slug,name)")
      .eq("status", "active")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    return rowToProduct(row as any, (row as any).categories?.slug ?? null, (row as any).categories?.name ?? null);
  });
