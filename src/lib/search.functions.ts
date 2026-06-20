import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getPublicClient() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

type Row = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  price: number;
  original_price: number | null;
  images: string[] | null;
  rating: number | null;
  review_count: number | null;
  status: string;
  badge: string | null;
  accent: string | null;
  category_id: string | null;
};

function scoreRow(p: any, term: string): number {
  const t = term.toLowerCase();
  const name = (p.title ?? "").toLowerCase();
  const tagline = (p.tagline ?? "").toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  if (name === t) return 100;
  if (name.startsWith(t)) return 80;
  if (name.includes(t)) return 60;
  if (tagline.includes(t)) return 40;
  if (desc.includes(t)) return 20;
  if (name.split(/\s+/).some((w: string) => w.startsWith(t))) return 50;
  return 0;
}

function toRow(p: any): Row {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    price: Number(p.price),
    original_price: p.original_price != null ? Number(p.original_price) : null,
    images: (p.images ?? []).filter(Boolean),
    rating: p.rating != null ? Number(p.rating) : null,
    review_count: p.review_count ?? 0,
    status: p.status ?? "active",
    badge: p.badge ?? null,
    accent: p.accent ?? null,
    category_id: p.category_id ?? null,
  };
}

/** Full-text + fuzzy search over the live DB catalog. */
export const searchProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string; limit?: number }) => {
    const q = (d?.q ?? "").toString().trim().slice(0, 100);
    const limit = Math.min(Math.max(Number(d?.limit) || 24, 1), 48);
    return { q, limit };
  })
  .handler(async ({ data }) => {
    if (!data.q) return [];
    const db = getPublicClient();
    // Pull a candidate set with ILIKE on title/tagline/description, then score in JS for ranking.
    const like = `%${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows } = await db
      .from("products")
      .select("id,slug,title,tagline,description,price,original_price,images,rating,review_count,status,badge,accent,category_id")
      .eq("status", "active")
      .or(`title.ilike.${like},tagline.ilike.${like},description.ilike.${like}`)
      .limit(100);
    const scored = (rows ?? [])
      .map((p: any) => ({ p, s: scoreRow(p, data.q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, data.limit)
      .map((x) => toRow(x.p));
    return scored;
  });

/** Quick title-prefix suggestions for the search bar's typeahead. */
export const suggestProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string }) => ({ q: (d?.q ?? "").toString().trim().slice(0, 60) }))
  .handler(async ({ data }) => {
    if (!data.q) return [];
    const db = getPublicClient();
    const like = `${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows } = await db
      .from("products")
      .select("id,slug,title")
      .eq("status", "active")
      .ilike("title", like)
      .limit(6);
    return (rows ?? []).map((p: any) => ({ id: p.id, slug: p.slug, title: p.title }));
  });
