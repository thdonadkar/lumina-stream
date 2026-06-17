import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { getCategory, CATEGORIES } from "@/lib/categories";
import { productsByCategorySlug } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/category/$slug")({
  head: ({ params }) => {
    const c = getCategory(params.slug);
    return {
      meta: [
        { title: c ? `${c.name} — Neural` : "Category" },
        { name: "description", content: c?.blurb ?? "Explore the catalog." },
      ],
    };
  },
  loader: ({ params }) => {
    const c = getCategory(params.slug);
    if (!c) throw notFound();
    return { slug: params.slug };
  },
  notFoundComponent: () => (
    <div className="px-4 pt-32 text-center">
      <h1 className="text-3xl font-extrabold">Category not found</h1>
      <Link to="/shop" className="text-cyan underline mt-4 inline-block">
        Browse all
      </Link>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const cat = getCategory(slug)!;
  const items = productsByCategorySlug(slug);
  const Icon = cat.icon;

  return (
    <div className="px-4 pt-28 pb-24 max-w-6xl mx-auto">
      {/* breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="size-3" />
        <Link to="/shop" className="hover:text-foreground">Shop</Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground">{cat.name}</span>
      </nav>

      {/* hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl glass-strong p-8 sm:p-12 mb-10"
      >
        <div className="absolute -inset-20 bg-aurora opacity-25 blur-3xl animate-aurora -z-10" />
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-xl">
            <div className="size-12 rounded-2xl glass grid place-items-center mb-4">
              <Icon className="size-5" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tighter">
              {cat.name}
            </h1>
            <p className="text-muted-foreground mt-2">{cat.blurb}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {cat.subs.map((s) => (
              <span
                key={s.slug}
                className="px-3 py-1.5 glass rounded-full text-xs font-medium"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* products */}
      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass-strong rounded-3xl p-12 text-center">
          <p className="text-muted-foreground">
            New {cat.name.toLowerCase()} drops landing soon. Check back this week.
          </p>
          <Link
            to="/shop"
            className="inline-block mt-4 px-5 py-2 rounded-full bg-aurora animate-aurora text-background text-sm font-bold"
          >
            Browse everything
          </Link>
        </div>
      )}

      {/* sibling categories */}
      <section className="mt-16">
        <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
          More categories
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CATEGORIES.filter((c) => c.slug !== slug)
            .slice(0, 8)
            .map((c) => {
              const I = c.icon;
              return (
                <Link
                  key={c.slug}
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="glass hover:glass-strong transition-all rounded-2xl p-4 flex items-center gap-3 group"
                >
                  <div className="size-9 rounded-xl bg-aurora animate-aurora grid place-items-center text-background shrink-0">
                    <I className="size-4" />
                  </div>
                  <span className="text-sm font-medium truncate">{c.name}</span>
                </Link>
              );
            })}
        </div>
      </section>
    </div>
  );
}
