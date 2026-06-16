import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, ShoppingBag, Heart, Share2, Shield, Truck, RotateCcw } from "lucide-react";
import { getProduct, products } from "@/lib/products";
import { useCart, formatPrice } from "@/lib/cart-store";
import { ProductCard } from "@/components/ProductCard";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  head: ({ params }) => {
    const p = getProduct(params.id);
    return {
      meta: [
        { title: p ? `${p.name} — Neural` : "Product" },
        { name: "description", content: p?.tagline ?? "" },
        { property: "og:image", content: p?.image ?? "" },
      ],
    };
  },
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  notFoundComponent: () => (
    <div className="px-6 max-w-3xl mx-auto py-24 text-center">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <Link to="/shop" className="mt-6 inline-block text-cyan">
        Back to shop
      </Link>
    </div>
  ),
  component: ProductPage,
});

type Particle = { id: number; x: number; y: number };

function ProductPage() {
  const { product } = Route.useLoaderData();
  const add = useCart((s) => s.add);
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState({ x: 50, y: 50, active: false });
  const [particles, setParticles] = useState<Particle[]>([]);

  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3);
  const others = products.filter((p) => p.id !== product.id).slice(0, 3);
  const recommendations = related.length >= 3 ? related : others;

  const handleAdd = (e: React.MouseEvent) => {
    add(product);
    toast.success(`${product.name} added to cart`);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const newP: Particle[] = Array.from({ length: 12 }).map((_, i) => ({
      id: Date.now() + i,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }));
    setParticles((p) => [...p, ...newP]);
    setTimeout(() => setParticles((p) => p.filter((x) => !newP.find((n) => n.id === x.id))), 900);
  };

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Gallery */}
        <div>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative aspect-square glass-strong rounded-[32px] overflow-hidden shadow-elevated cursor-zoom-in"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setZoom({
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
                active: true,
              });
            }}
            onMouseLeave={() => setZoom((z) => ({ ...z, active: false }))}
          >
            <div className="absolute -inset-10 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
            <AnimatePresence mode="wait">
              <motion.img
                key={imgIdx}
                src={product.gallery[imgIdx] || product.image}
                alt={product.name}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: zoom.active ? 1.6 : 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                style={
                  zoom.active
                    ? { transformOrigin: `${zoom.x}% ${zoom.y}%` }
                    : undefined
                }
                className="size-full object-cover"
              />
            </AnimatePresence>
            {product.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full glass-strong text-[10px] font-mono uppercase tracking-wider text-cyan">
                {product.badge}
              </span>
            )}
          </motion.div>

          {product.gallery.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.gallery.map((g: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`size-20 rounded-xl overflow-hidden ring-1 transition-all ${
                    i === imgIdx ? "ring-cyan shadow-glow-cyan" : "ring-white/10"
                  }`}
                >
                  <img src={g} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[10px] font-mono uppercase tracking-widest text-cyan mb-3">
            {product.category}
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
            {product.name}
          </h1>
          <p className="text-lg text-muted-foreground mt-2">{product.tagline}</p>

          <div className="mt-4 flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-4 ${
                    s <= Math.round(product.rating) ? "fill-cyan text-cyan" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className="font-mono">{product.rating}</span>
            <span className="text-muted-foreground">· {product.reviews} reviews</span>
          </div>

          <div className="mt-8 flex items-end gap-3">
            <p className="text-5xl font-extrabold font-mono text-gradient">
              {formatPrice(product.price)}
            </p>
            {product.originalPrice && (
              <p className="text-lg font-mono text-muted-foreground line-through mb-2">
                {formatPrice(product.originalPrice)}
              </p>
            )}
            {product.originalPrice && (
              <span className="mb-2 px-2 py-0.5 rounded-md glass text-xs font-mono text-cyan">
                Save {formatPrice(product.originalPrice - product.price)}
              </span>
            )}
          </div>

          <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <motion.button
              onClick={handleAdd}
              whileTap={{ scale: 0.96 }}
              className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-aurora animate-aurora font-bold text-background shadow-glow-cyan"
            >
              <ShoppingBag className="size-5" />
              Add to cart
            </motion.button>
            <button className="size-14 grid place-items-center rounded-2xl glass-strong hover:bg-glass-strong">
              <Heart className="size-5" />
            </button>
            <button className="size-14 grid place-items-center rounded-2xl glass-strong hover:bg-glass-strong">
              <Share2 className="size-5" />
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: "Free shipping" },
              { icon: Shield, label: "2-yr warranty" },
              { icon: RotateCcw, label: "30-day returns" },
            ].map((f) => (
              <div key={f.label} className="glass rounded-xl p-3 text-center">
                <f.icon className="size-4 mx-auto text-cyan mb-1" />
                <p className="text-[10px] font-medium text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Reviews */}
      <section className="mt-24">
        <h2 className="text-2xl font-bold mb-6">Customer signal</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-strong rounded-2xl p-6">
            <p className="text-5xl font-extrabold font-mono text-gradient">
              {product.rating}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              From {product.reviews} verified buyers
            </p>
            <div className="mt-4 space-y-2">
              {[5, 4, 3, 2, 1].map((s) => {
                const w = s === 5 ? 78 : s === 4 ? 16 : s === 3 ? 4 : 1;
                return (
                  <div key={s} className="flex items-center gap-3 text-xs">
                    <span className="w-3 font-mono text-muted-foreground">{s}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${w}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.1 * (5 - s) }}
                        className="h-full bg-aurora"
                      />
                    </div>
                    <span className="w-8 font-mono text-muted-foreground">{w}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          {[
            { name: "Aria K.", text: "Genuinely changed my workflow. The haptics are uncanny." },
            { name: "Mateo R.", text: "Build quality is on another tier. Looks like jewelry." },
          ].map((r) => (
            <div key={r.name} className="glass rounded-2xl p-6">
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="size-3 fill-cyan text-cyan" />
                ))}
              </div>
              <p className="text-sm">{r.text}</p>
              <p className="mt-4 text-xs font-mono text-muted-foreground">— {r.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* You may also like */}
      <section className="mt-24">
        <h2 className="text-2xl font-bold mb-6">You may also like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* Particle burst */}
      <div className="fixed inset-0 pointer-events-none z-[80]">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.span
              key={p.id}
              initial={{ x: p.x, y: p.y, opacity: 1, scale: 1 }}
              animate={{
                x: p.x + (Math.random() - 0.5) * 240,
                y: p.y - Math.random() * 200 - 60,
                opacity: 0,
                scale: 0,
              }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="absolute size-2 rounded-full bg-aurora"
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
