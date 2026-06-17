import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Neural" },
      { name: "description", content: "Neural builds cinematic commerce experiences for the post-screen era." },
      { property: "og:title", content: "About — Neural" },
      { property: "og:description", content: "Cinematic commerce, engineered." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="px-4 pt-28 pb-24 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs uppercase tracking-widest text-cyan font-mono mb-2">About</p>
        <h1 className="text-5xl font-extrabold tracking-tighter">Commerce, made cinematic.</h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Neural is a futuristic marketplace platform combining glass-grade UI, AI-native discovery, and
          a developer-first infrastructure. We exist to make every transaction feel like a product
          experience — not a checkout.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-10">
          {[
            { k: "2,400+", v: "Brands onboarded" },
            { k: "120 ms", v: "Median checkout" },
            { k: "99.98%", v: "Platform uptime" },
          ].map((s) => (
            <div key={s.v} className="glass-strong rounded-2xl p-5">
              <p className="text-3xl font-extrabold tracking-tighter text-gradient">{s.k}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.v}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
