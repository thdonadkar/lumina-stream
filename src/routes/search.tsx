import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Mic, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { searchProducts, suggestProducts } from "@/lib/search.functions";
import { CATEGORIES } from "@/lib/categories";

export const Route = createFileRoute("/search")({
  head: ({ search }) => {
    const q = (search as { q?: string })?.q ?? "";
    const title = q ? `Search "${q}" — Neural` : "Search — Neural";
    return {
      meta: [
        { title },
        { name: "description", content: q ? `Results for "${q}" on Neural.` : "Search products on Neural." },
        { property: "og:title", content: title },
        { property: "og:url", content: "/search" },
      ],
      links: [{ rel: "canonical", href: "/search" }],
    };
  },
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
  }),
  component: SearchPage,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  price: number;
  original_price: number | null;
  images: string[] | null;
  rating: number | null;
  review_count: number | null;
  badge: string | null;
};

function SearchPage() {
  const { q: initial } = Route.useSearch();
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<Row[]>([]);
  const [suggestions, setSuggestions] = useState<{ id: string; slug: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const runSearch = useServerFn(searchProducts);
  const runSuggest = useServerFn(suggestProducts);

  // Debounced live search.
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(async () => {
      try {
        const [rows, sug] = await Promise.all([
          runSearch({ data: { q: term, limit: 24 } }),
          runSuggest({ data: { q: term } }),
        ]);
        setResults(rows as Row[]);
        setSuggestions(sug as { id: string; slug: string; title: string }[]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [q, runSearch, runSuggest]);

  const heading = useMemo(() => {
    if (loading) return "Searching…";
    if (!q) return null;
    return `${results.length} result${results.length === 1 ? "" : "s"} for "${q}"`;
  }, [loading, q, results.length]);

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
            placeholder="Search products, descriptions…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            aria-label="Search products"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Clear search">
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const SR: any = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
              if (!SR) {
                import("sonner").then((m) => m.toast.error("Voice search not supported in this browser"));
                return;
              }
              const rec = new SR();
              rec.lang = navigator.language || "en-US";
              rec.interimResults = false;
              rec.maxAlternatives = 1;
              rec.onresult = (e: any) => setQ(e.results[0][0].transcript);
              rec.onerror = () => { /* ignore */ };
              rec.start();
            }}
            className="grid place-items-center size-8 rounded-full bg-aurora animate-aurora text-background"
            aria-label="Voice search"
            title="Voice search"
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
                  <span className="font-medium">{s.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.div>

      <div className="mt-10">
        {q ? (
          results.length > 0 ? (
            <>
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">{heading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="glass-strong rounded-2xl overflow-hidden hover:shadow-elevated transition-shadow"
                  >
                    <div className="aspect-square bg-secondary overflow-hidden">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.title} className="size-full object-cover" loading="lazy" />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-1">{p.title}</h3>
                      {p.tagline && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.tagline}</p>
                      )}
                      <p className="mt-2 font-mono text-cyan">₹{Number(p.price).toLocaleString("en-IN")}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : !loading ? (
            <div className="glass-strong rounded-3xl p-12 text-center">
              <h3 className="text-lg font-bold">No results for "{q}"</h3>
              <p className="text-sm text-muted-foreground mt-1">Try a different keyword or browse by category.</p>
            </div>
          ) : null
        ) : (
          <>
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Browse categories</h2>
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
