import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const PRODUCT_COLS =
  "id,slug,title,tagline,description,price,original_price,images,rating,review_count,status,badge,accent,category_id";

function publicClient() {
  return createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Full-text + fuzzy search over active products.
 * Strategy: try websearch_to_tsquery for typed multi-word queries; fall back
 * to a trigram ilike match for short / typo queries.
 */
export const searchProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string; limit?: number }) => {
    const q = (d?.q ?? "").toString().trim().slice(0, 100);
    const limit = Math.min(Math.max(Number(d?.limit) || 24, 1), 48);
    return { q, limit };
  })
  .handler(async ({ data }) => {
    const supabase = publicClient();
    if (!data.q) return [];

    // Primary: full-text. textSearch with 'websearch' parses quoted phrases & OR.
    const { data: ftRows } = await supabase
      .from("products")
      .select(PRODUCT_COLS)
      .eq("status", "active")
      .textSearch("search_tsv", data.q, { type: "websearch", config: "english" })
      .limit(data.limit);

    if (ftRows && ftRows.length > 0) return ftRows;

    // Fallback: trigram fuzzy on title (handles typos & single-word fragments)
    const { data: fuzzyRows } = await supabase
      .from("products")
      .select(PRODUCT_COLS)
      .eq("status", "active")
      .ilike("title", `%${data.q}%`)
      .limit(data.limit);

    return fuzzyRows ?? [];
  });

/** Quick title-prefix suggestions for the search bar's typeahead. */
export const suggestProducts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string }) => ({ q: (d?.q ?? "").toString().trim().slice(0, 60) }))
  .handler(async ({ data }) => {
    if (!data.q) return [];
    const supabase = publicClient();
    const { data: rows } = await supabase
      .from("products")
      .select("id,slug,title")
      .eq("status", "active")
      .ilike("title", `${data.q}%`)
      .limit(6);
    return rows ?? [];
  });
