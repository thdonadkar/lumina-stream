import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, SlidersHorizontal, Star, Search, ArrowUpDown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { categories as STATIC_CATEGORIES, type Product } from "@/lib/products";
import { listActiveProducts } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/ProductCard";
import { Slider } from "@/components/ui/slider";
import { formatPrice } from "@/lib/cart-store";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop — AtomSpot" },
      { name: "description", content: "Browse the full catalog of AtomSpot hardware." },
    ],
  }),
  component: Shop,
});

type SortKey = "featured" | "price-asc" | "price-desc" | "rating";

function Shop() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [category, setCategory] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 4000]);
  const [sort, setSort] = useState<SortKey>("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");

  const listFn = useServerFn(listActiveProducts);
  const { data: dbProducts, isLoading: dbLoading } = useQuery<Product[]>({
    queryKey: ["catalog", "active"],
    queryFn: () => listFn(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // DB is the source of truth. Empty array means show empty state.
  const products = useMemo<Product[]>(() => dbProducts ?? [], [dbProducts]);

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) if (p.category) seen.add(p.category);
    for (const c of STATIC_CATEGORIES) seen.add(c);
    return Array.from(seen);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = products.filter(
      (p) =>
        (!category || p.category === category) &&
        p.rating >= minRating &&
        p.price >= priceRange[0] &&
        p.price <= priceRange[1] &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.tagline ?? "").toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.category ?? "").toLowerCase().includes(q)),
    );
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, category, minRating, priceRange, sort, query]);

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Catalog / {filtered.length} items
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
          The full <span className="text-gradient">arsenal</span>
        </h1>
      </div>

      {/* Toolbar */}
      <div className="sticky top-20 z-30 glass-strong rounded-2xl p-3 mb-6 flex flex-col gap-3">
        <div className="flex items-center gap-2 glass rounded-xl px-3 py-2">
          <Search className="size-4 text-cyan shrink-0" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, or keyword…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground min-w-0"
            aria-label="Search products"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="grid place-items-center size-6 rounded-full glass hover:glass-strong text-muted-foreground"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass hover:glass-strong text-sm font-medium"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl glass hover:glass-strong text-sm font-medium cursor-pointer">
            <ArrowUpDown className="size-4 text-cyan" />
            <span className="text-muted-foreground text-xs hidden sm:inline">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent border-0 outline-none cursor-pointer font-medium text-foreground"
              aria-label="Sort products"
            >
              <option className="bg-background text-foreground" value="featured">Featured</option>
              <option className="bg-background text-foreground" value="price-asc">Price: low to high</option>
              <option className="bg-background text-foreground" value="price-desc">Price: high to low</option>
              <option className="bg-background text-foreground" value="rating">Top rated</option>
            </select>
          </label>

          <div className="ml-auto flex items-center gap-1 glass rounded-xl p-1">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              className={`size-8 grid place-items-center rounded-lg transition-colors ${
                view === "grid" ? "bg-glass-strong text-cyan" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              className={`size-8 grid place-items-center rounded-lg transition-colors ${
                view === "list" ? "bg-glass-strong text-cyan" : "text-muted-foreground"
              }`}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="glass-strong rounded-2xl p-5 grid md:grid-cols-3 gap-6">
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Category
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      !category ? "bg-aurora text-background" : "glass hover:glass-strong"
                    }`}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        category === c ? "bg-aurora text-background" : "glass hover:glass-strong"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    Price
                  </p>
                  <p className="text-xs font-mono text-cyan">
                    {formatPrice(priceRange[0])} – {formatPrice(priceRange[1])}
                  </p>
                </div>
                <Slider
                  min={0}
                  max={4000}
                  step={50}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                />
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Min rating
                </p>
                <div className="flex gap-1">
                  {[0, 4, 4.5, 4.8].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
                        minRating === r ? "bg-aurora text-background" : "glass"
                      }`}
                    >
                      <Star className="size-3" />
                      {r === 0 ? "Any" : r + "+"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p, i) => (
            <motion.a
              key={p.id}
              href={`/product/${p.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-2xl p-3 flex items-center gap-4 hover:glass-strong transition-all"
            >
              <div className="size-20 sm:size-24 rounded-xl bg-secondary overflow-hidden shrink-0">
                <img referrerPolicy="no-referrer" src={p.image} alt={p.name} className="size-full object-cover" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{p.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{p.tagline}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="size-3 fill-cyan text-cyan" />
                  <span className="font-mono">{p.rating}</span>
                  <span>· {p.category}</span>
                </div>
              </div>
              <p className="font-mono font-bold text-cyan shrink-0">{formatPrice(p.price)}</p>
            </motion.a>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          {dbLoading ? (
            <p className="text-sm text-muted-foreground">Loading catalog…</p>
          ) : (dbProducts?.length ?? 0) === 0 ? (
            <>
              <p className="font-semibold">No products available right now</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon — new gear lands often.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">No matches found</p>
              <p className="text-sm text-muted-foreground mt-1">Try widening your filters.</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
