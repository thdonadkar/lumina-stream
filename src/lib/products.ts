export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  categorySlug: string; // maps to CATEGORIES slug
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  accent: "cyan" | "purple" | "rose";
  badge?: string;
  inStock: boolean;
  stock?: number;
};

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const products: Product[] = [
  // ELECTRONICS
  {
    id: "void-receptor",
    name: "Void Receptor",
    tagline: "Neuro-haptic spatial computing headset",
    description:
      "The world's first neuro-haptic interface designed for high-fidelity spatial computing. Built around a custom R2 silicon photonics engine.",
    price: 2499, originalPrice: 2899,
    category: "Headsets", categorySlug: "electronics",
    rating: 4.9, reviews: 1284, accent: "purple", badge: "New",
    inStock: true, stock: 18,
    image: img("photo-1622979135225-d2ba269cf1ac"),
    gallery: [img("photo-1622979135225-d2ba269cf1ac"), img("photo-1592478411213-6153e4ebc07d"), img("photo-1626218174358-7769486e2e51")],
  },
  {
    id: "onyx-controller",
    name: "Onyx Controller",
    tagline: "Zero-latency haptics, machined titanium",
    description: "Precision controller engineered for sub-millisecond response.",
    price: 499, category: "Controllers", categorySlug: "electronics",
    rating: 4.8, reviews: 932, accent: "cyan", inStock: true, stock: 64,
    image: img("photo-1592840496694-26d035b52b48"),
    gallery: [img("photo-1592840496694-26d035b52b48")],
  },
  {
    id: "echo-implants",
    name: "Echo Implants",
    tagline: "Spatial audio earpieces",
    description: "Ultra-light spatial audio earpieces with bio-adaptive equalization.",
    price: 820, category: "Audio", categorySlug: "electronics",
    rating: 4.9, reviews: 2104, accent: "cyan", inStock: true, stock: 132,
    image: img("photo-1606220945770-b5b6c2c55bf1"),
    gallery: [img("photo-1606220945770-b5b6c2c55bf1")],
  },
  {
    id: "chronos-band",
    name: "Chronos Band",
    tagline: "Bio-haptic wristband, sapphire",
    description: "Continuous biometrics with sapphire glass face. 7-day battery.",
    price: 390, category: "Wearables", categorySlug: "electronics",
    rating: 4.6, reviews: 678, accent: "purple", inStock: true, stock: 90,
    image: img("photo-1579586337278-3befd40fd17a"),
    gallery: [img("photo-1579586337278-3befd40fd17a")],
  },
  {
    id: "monolith-slate",
    name: "Monolith Slate",
    tagline: "Modular workstation laptop",
    description: "16-inch modular workstation with hot-swappable cores.",
    price: 3450, category: "Laptops", categorySlug: "electronics",
    rating: 4.8, reviews: 312, accent: "rose", badge: "Limited",
    inStock: true, stock: 7,
    image: img("photo-1517336714731-489689fd1ca8"),
    gallery: [img("photo-1517336714731-489689fd1ca8")],
  },
  {
    id: "prism-tablet",
    name: "Prism Tablet",
    tagline: "16K micro-OLED creative slate",
    description: "Whisper-thin creative tablet with quantum stylus.",
    price: 1299, category: "Tablets", categorySlug: "electronics",
    rating: 4.7, reviews: 421, accent: "rose", inStock: true, stock: 22,
    image: img("photo-1561154464-82e9adf32764"),
    gallery: [img("photo-1561154464-82e9adf32764")],
  },
  {
    id: "core-node",
    name: "Core Node",
    tagline: "Edge AI compute brick — 80 TOPS",
    description: "Pocketable edge AI compute brick, passively cooled.",
    price: 720, category: "Computing", categorySlug: "electronics",
    rating: 4.7, reviews: 256, accent: "purple", inStock: true, stock: 41,
    image: img("photo-1518770660439-4636190af475"),
    gallery: [img("photo-1518770660439-4636190af475")],
  },

  // FASHION
  {
    id: "obsidian-jacket",
    name: "Obsidian Field Jacket",
    tagline: "Recycled techwear shell",
    description: "Three-layer recycled shell with magnetic seam closures.",
    price: 320, originalPrice: 420, category: "Men", categorySlug: "fashion",
    rating: 4.7, reviews: 188, accent: "purple", badge: "−24%",
    inStock: true, stock: 28,
    image: img("photo-1551028719-00167b16eac5"),
    gallery: [img("photo-1551028719-00167b16eac5")],
  },
  {
    id: "aurora-dress",
    name: "Aurora Drape Dress",
    tagline: "Liquid satin, asymmetric cut",
    description: "Hand-finished liquid satin with weighted hem.",
    price: 480, category: "Women", categorySlug: "fashion",
    rating: 4.8, reviews: 96, accent: "rose", inStock: true, stock: 14,
    image: img("photo-1539109136881-3be0616acf4b"),
    gallery: [img("photo-1539109136881-3be0616acf4b")],
  },
  {
    id: "nova-sneakers",
    name: "Nova Sneakers",
    tagline: "Carbon midsole runners",
    description: "Featherweight runners with continuous carbon plate.",
    price: 260, category: "Shoes", categorySlug: "fashion",
    rating: 4.6, reviews: 532, accent: "cyan", inStock: true, stock: 81,
    image: img("photo-1542291026-7eec264c27ff"),
    gallery: [img("photo-1542291026-7eec264c27ff")],
  },

  // HOME & FURNITURE
  {
    id: "halo-lamp",
    name: "Halo Lamp",
    tagline: "Adaptive ambient lighting",
    description: "Smart ambient lamp tuned to your circadian rhythm.",
    price: 280, category: "Lighting", categorySlug: "home-furniture",
    rating: 4.5, reviews: 144, accent: "cyan", inStock: true, stock: 33,
    image: img("photo-1565814329452-e1efa11c5b89"),
    gallery: [img("photo-1565814329452-e1efa11c5b89")],
  },
  {
    id: "drift-sofa",
    name: "Drift Modular Sofa",
    tagline: "Cloud-cell foam, washable bouclé",
    description: "Modular cloud-cell sofa with washable bouclé covers.",
    price: 2890, category: "Living Room", categorySlug: "home-furniture",
    rating: 4.7, reviews: 78, accent: "rose", inStock: true, stock: 6,
    image: img("photo-1555041469-a586c61ea9bc"),
    gallery: [img("photo-1555041469-a586c61ea9bc")],
  },
  {
    id: "mono-kettle",
    name: "Mono Kettle",
    tagline: "Pour-over kettle, brushed steel",
    description: "Variable-temperature pour-over kettle with ambient screen.",
    price: 220, category: "Kitchen", categorySlug: "home-furniture",
    rating: 4.6, reviews: 312, accent: "purple", inStock: true, stock: 47,
    image: img("photo-1517705008128-361805f42e86"),
    gallery: [img("photo-1517705008128-361805f42e86")],
  },

  // BEAUTY
  {
    id: "lumen-serum",
    name: "Lumen Vitamin-C Serum",
    tagline: "Stabilized 15% L-ascorbic",
    description: "Stabilized L-ascorbic serum in lightless violet glass.",
    price: 78, category: "Skincare", categorySlug: "beauty",
    rating: 4.8, reviews: 1421, accent: "rose", inStock: true, stock: 250,
    image: img("photo-1556228720-195a672e8a03"),
    gallery: [img("photo-1556228720-195a672e8a03")],
  },
  {
    id: "noir-fragrance",
    name: "Noir 07",
    tagline: "Smoke, oud, vetiver",
    description: "Long-wear extrait, hand-blended in micro-batches.",
    price: 195, category: "Fragrance", categorySlug: "beauty",
    rating: 4.9, reviews: 412, accent: "purple", inStock: true, stock: 60,
    image: img("photo-1541643600914-78b084683601"),
    gallery: [img("photo-1541643600914-78b084683601")],
  },

  // SPORTS
  {
    id: "ion-mat",
    name: "Ion Yoga Mat",
    tagline: "Bio-resin, copper grip",
    description: "Eco bio-resin mat with conductive copper grip lines.",
    price: 120, category: "Yoga", categorySlug: "sports",
    rating: 4.7, reviews: 233, accent: "cyan", inStock: true, stock: 88,
    image: img("photo-1518611012118-696072aa579a"),
    gallery: [img("photo-1518611012118-696072aa579a")],
  },
  {
    id: "force-kettlebell",
    name: "Force Kettlebell 16kg",
    tagline: "Powder-coated cast iron",
    description: "Competition spec, single-cast handle.",
    price: 95, category: "Gym", categorySlug: "sports",
    rating: 4.6, reviews: 412, accent: "purple", inStock: true, stock: 120,
    image: img("photo-1517836357463-d25dfeac3438"),
    gallery: [img("photo-1517836357463-d25dfeac3438")],
  },

  // BOOKS
  {
    id: "book-eon",
    name: "Eon — A Spatial Cartography",
    tagline: "Hardcover, signed first edition",
    description: "Linen-bound hardcover. 412 pages of speculative cartography.",
    price: 48, category: "Tech & Science", categorySlug: "books",
    rating: 4.8, reviews: 162, accent: "rose", inStock: true, stock: 75,
    image: img("photo-1512820790803-83ca734da794"),
    gallery: [img("photo-1512820790803-83ca734da794")],
  },

  // GROCERY
  {
    id: "neon-matcha",
    name: "Neon Ceremonial Matcha",
    tagline: "Stone-milled, Uji",
    description: "Single-origin first-harvest matcha, 30g tin.",
    price: 42, category: "Beverages", categorySlug: "grocery",
    rating: 4.7, reviews: 891, accent: "cyan", inStock: true, stock: 300,
    image: img("photo-1542838132-92c53300491e"),
    gallery: [img("photo-1542838132-92c53300491e")],
  },

  // TOYS
  {
    id: "cosmo-bricks",
    name: "Cosmo Bricks Voyager Set",
    tagline: "812 pieces, glow-in-the-dark",
    description: "Modular building set with photoluminescent accent bricks.",
    price: 110, category: "Kids", categorySlug: "toys",
    rating: 4.6, reviews: 245, accent: "purple", inStock: true, stock: 54,
    image: img("photo-1558877385-8c1b8e35d6c8"),
    gallery: [img("photo-1558877385-8c1b8e35d6c8")],
  },

  // AUTOMOTIVE
  {
    id: "vector-toolkit",
    name: "Vector EV Toolkit",
    tagline: "44-piece magnetic kit",
    description: "Magnetic-base EV maintenance kit in a milled aluminum case.",
    price: 320, category: "Tools", categorySlug: "automotive",
    rating: 4.7, reviews: 78, accent: "cyan", inStock: false, stock: 0,
    image: img("photo-1492144534655-ae79c964c9d7"),
    gallery: [img("photo-1492144534655-ae79c964c9d7")],
  },
];

export const categories = Array.from(new Set(products.map((p) => p.category)));

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export function productsByCategorySlug(slug: string) {
  return products.filter((p) => p.categorySlug === slug);
}

export function searchProducts(q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(term) ||
      p.tagline.toLowerCase().includes(term) ||
      p.category.toLowerCase().includes(term) ||
      p.categorySlug.includes(term),
  );
}
