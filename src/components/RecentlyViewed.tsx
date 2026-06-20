import { useRecentlyViewed } from "@/lib/recently-viewed-store";
import { ProductCard } from "@/components/ProductCard";

/**
 * Strip of products the user has recently viewed. Renders nothing when
 * empty (e.g. first-time visitors), so it's safe to drop on any page.
 * Optionally hide a specific product id (e.g. the one currently being viewed).
 */
export function RecentlyViewed({ excludeId, title = "Recently viewed" }: { excludeId?: string; title?: string }) {
  const items = useRecentlyViewed((s) => s.items).filter((p) => p.id !== excludeId).slice(0, 6);
  if (items.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold mb-6">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {items.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} />
        ))}
      </div>
    </section>
  );
}
