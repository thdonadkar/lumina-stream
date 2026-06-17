import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Mic, X } from "lucide-react";
import { searchProducts, products } from "@/lib/products";
import { CATEGORIES } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/search")({
  head: () => ({ meta: [{ title: "Search — Neural" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const results = useMemo(() => (q ? searchProducts(q) : []), [q]);

  const suggestions = useMemo(() => {
    if (!q) return [];
    const lower = q.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().startsWith(lower))
      .slice(0, 5);
  }, [q]);

  return (
    <div className="px-4 pt-28 pb-24 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-6 sm:p-8 relative overflow-hidden"
      >
        <div className="absolute -inset-10 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
        <label className="flex items-center gap-3 rounded-2xl glass px-4 py-3">
          <SearchIcon className="size-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, categories, brands…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear">
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <button
            className="grid place-items-center size-8 rounded-full bg-aurora animate-aurora text-background"
            aria-label="Voice search"
            title="Voice search (demo)"
          >
            <Mic className="size-4" />
          </button>
        </label>

        {suggestions.length > 0 && (
          <ul className="mt-3 glass rounded-xl divide-y divide-white/5 overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.id}>
                <Link
                  to="/product/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5"
                >
                  <SearchIcon className="size-3.5 text-muted-foreground" />
                  <span className="font-medium">{s.name}</span>
                  <span className="text-xs text-muted-foreground">— {s.category}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      {/* Results */}
      <div className="mt-10">
        {q ? (
          results.length > 0 ? (
            <>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                {results.length} result{results.length === 1 ? "" : "s"} for "{q}"
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </>
          ) : (
            <div className="glass-strong rounded-3xl p-12 text-center">
              <h3 className="text-lg font-bold">No results for "{q}"</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Try a different keyword or browse by category.
              </p>
            </div>
          )
        ) : (
          <>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
              Browse categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {CATEGORIES.map((c) => {
                const I = c.icon;
                return (
                  <Link
                    key={c.slug}
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="glass hover:glass-strong rounded-2xl p-4 flex items-center gap-3"
                  >
                    <div className="size-9 rounded-xl bg-aurora animate-aurora grid place-items-center text-background">
                      <I className="size-4" />
                    </div>
                    <span className="text-sm font-medium">{c.name}</span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
