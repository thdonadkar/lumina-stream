import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, Zap, Cpu, Headphones, Flame } from "lucide-react";
import { products } from "@/lib/products";
import { CATEGORIES } from "@/lib/categories";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { listActiveBanners } from "@/lib/banners.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neural — Future-grade hardware" },
      { name: "description", content: "Premium futuristic hardware for spatial computing, audio and wearables." },
    ],
  }),
  component: Home,
});


function Home() {
  const hero = products[0];
  const trending = products.slice(1, 7);
  const [banners, setBanners] = useState<any[]>([]);
  const fetchBanners = useServerFn(listActiveBanners);
  useEffect(() => { fetchBanners().then(setBanners).catch(() => {}); }, [fetchBanners]);

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto space-y-24 md:space-y-32">
      {banners.length > 0 && (
        <section className="pt-8 -mb-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-widest text-rose-400 mb-2 flex items-center gap-1.5">
                <Flame className="size-3" /> Limited time
              </p>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">🔥 Featured Offers</h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:block">
              {banners.length} live deal{banners.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.slice(0, 4).map((b, i) => (
              <Link
                key={b.id}
                to={b.cta_link || "/shop"}
                className="group relative glass-strong rounded-3xl overflow-hidden flex min-h-[160px] hover:ring-2 hover:ring-cyan/40 transition-all shadow-elevated"
              >
                <div className="relative w-2/5 sm:w-1/2 shrink-0 overflow-hidden">
                  {b.image_url ? (
                    <img src={b.image_url} alt="" className="absolute inset-0 size-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 bg-aurora animate-aurora opacity-70" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/60" />
                </div>
                <div className="p-5 flex-1 min-w-0 flex flex-col justify-center">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 mb-1">Offer #{i + 1}</span>
                  <p className="font-bold text-lg leading-tight">{b.title}</p>
                  {b.subtitle && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.subtitle}</p>}
                  {b.cta_text && (
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan w-fit">
                      {b.cta_text} <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* HERO */}
      <section className="relative pt-8 md:pt-12">
        <div className="absolute inset-0 bg-hero blur-3xl -z-10" />


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center"
        >
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-6"
            >
              <span className="size-1.5 rounded-full bg-cyan animate-pulse" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan">
                Collection / 024
              </span>
            </motion.div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-tighter leading-[0.9] text-balance">
              Objects of pure{" "}
              <span className="text-gradient">
                computational
              </span>{" "}
              light.
            </h1>

            <p className="mt-8 text-base md:text-lg text-muted-foreground max-w-md text-pretty">
              Next-gen bio-integrated hardware for the seamless synthesis of human
              consciousness and digital reality. Finished in obsidian glass.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link
                to="/product/$id"
                params={{ id: hero.id }}
                className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-aurora animate-aurora font-bold text-background shadow-glow-cyan hover:scale-[1.02] active:scale-95 transition-transform"
              >
                Explore Receptor
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full glass-strong font-semibold hover:bg-glass-strong transition-colors"
              >
                Browse catalog
              </Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 max-w-md">
              {[
                { label: "Latency", value: "0.002ms" },
                { label: "Battery", value: "14h" },
                { label: "Resolution", value: "16K" },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <p className="text-2xl font-extrabold font-mono text-foreground">
                    {s.value}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative aspect-square max-w-lg mx-auto lg:max-w-none w-full"
          >
            <div className="absolute -inset-10 bg-aurora opacity-30 blur-[100px] rounded-full animate-aurora" />
            <motion.div
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative glass-strong rounded-[40px] overflow-hidden aspect-square shadow-elevated"
            >
              <img
                src={hero.image}
                alt={hero.name}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-cyan">
                    Featured
                  </p>
                  <p className="text-xl font-bold">{hero.name}</p>
                </div>
                <p className="font-mono font-bold text-cyan">
                  ₹{hero.price.toLocaleString("en-IN")}
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -right-2 sm:-right-6 top-1/4 glass-strong rounded-2xl p-4 w-44 shadow-glow-cyan hidden sm:block"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Neural sync
              </p>
              <p className="text-2xl font-bold font-mono mt-1">0.002ms</p>
              <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "85%" }}
                  transition={{ delay: 1, duration: 1.2 }}
                  className="h-full bg-aurora"
                />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* CATEGORIES */}
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Browse / 07
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Categories</h2>
          </div>
        </motion.div>

        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          {CATEGORIES.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.slug}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to="/category/$slug"
                  params={{ slug: c.slug }}
                  className="shrink-0 inline-flex items-center gap-2 glass rounded-full pl-3 pr-5 py-2.5 hover:glass-strong hover:scale-105 transition-all"
                >
                  <div className="size-7 rounded-full bg-aurora animate-aurora grid place-items-center">
                    <Icon className="size-3.5 text-background" />
                  </div>
                  <span className="font-medium text-sm whitespace-nowrap">{c.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* TRENDING */}
      <section>
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Real-time
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Trending now
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trending.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} />
          ))}
        </div>
      </section>

      {/* AI RECOMMENDATIONS */}
      <section className="relative glass-strong rounded-[32px] p-8 md:p-12 overflow-hidden">
        <div className="absolute -inset-1 bg-aurora opacity-20 blur-3xl animate-aurora -z-10" />
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 mb-6">
              <Sparkles className="size-3 text-purple" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-purple">
                AI Concierge
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Tuned to your signal.
            </h2>
            <p className="text-muted-foreground max-w-md text-pretty">
              Our on-device model studies your patterns and surfaces hardware that
              fits your workflow. Private. Instantaneous. Always learning.
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass font-semibold hover:glass-strong transition-colors"
            >
              See recommendations <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {products.slice(2, 6).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-2 aspect-square overflow-hidden relative"
              >
                <img src={p.image} alt={p.name} className="size-full object-cover rounded-xl" />
                <div className="absolute bottom-3 left-3 right-3 glass-strong rounded-lg px-2 py-1">
                  <p className="text-xs font-semibold truncate">{p.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
