import { createServerFn } from "@tanstack/react-start";
import { products as STATIC_PRODUCTS } from "@/lib/products";

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

function toRow(p: (typeof STATIC_PRODUCTS)[number]): Row {
  return {
    id: p.id,
    slug: p.id,
    title: p.name,
    tagline: p.tagline ?? null,
    description: p.description ?? null,
    price: p.price,
    original_price: p.originalPrice ?? null,
    images: [p.image, ...(p.gallery ?? [])].filter(Boolean),
    rating: p.rating ?? null,
    review_count: p.reviews ?? null,
    status: "active",
    badge: p.badge ?? null,
    accent: p.accent ?? null,
    category_id: p.categorySlug ?? null,
  };
}

function scoreMatch(p: (typeof STATIC_PRODUCTS)[number], term: string): number {
  const t = term.toLowerCase();
  const name = p.name.toLowerCase();
  const tagline = (p.tagline ?? "").toLowerCase();
  const desc = (p.description ?? "").toLowerCase();
  const category = (p.category ?? "").toLowerCase();
  if (name === t) return 100;
  if (name.startsWith(t)) return 80;
  if (name.includes(t)) return 60;
  if (tagline.includes(t)) return 40;
  if (category.includes(t)) return 30;
  if (desc.includes(t)) return 20;
  // token-by-token fuzzy: any word starts with term
  if (name.split(/\s+/).some((w) => w.startsWith(t))) return 50;
  return 0;
}

/** Full-text + fuzzy search over the catalog. */
export const searchProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string; limit?: number }) => {
    const q = (d?.q ?? "").toString().trim().slice(0, 100);
    const limit = Math.min(Math.max(Number(d?.limit) || 24, 1), 48);
    return { q, limit };
  })
  .handler(async ({ data }) => {
    if (!data.q) return [];
    const term = data.q;
    const scored = STATIC_PRODUCTS
      .map((p) => ({ p, s: scoreMatch(p, term) }))
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
    const t = data.q.toLowerCase();
    return STATIC_PRODUCTS
      .filter((p) => p.name.toLowerCase().includes(t))
      .slice(0, 6)
      .map((p) => ({ id: p.id, slug: p.id, title: p.name }));
  });
