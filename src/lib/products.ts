export type Product = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  rating: number;
  reviews: number;
  image: string;
  gallery: string[];
  accent: "cyan" | "purple" | "rose";
  badge?: string;
  inStock: boolean;
};

const img = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

export const products: Product[] = [
  {
    id: "void-receptor",
    name: "Void Receptor",
    tagline: "Neuro-haptic spatial computing headset",
    description:
      "The world's first neuro-haptic interface designed for high-fidelity spatial computing. Built around a custom R2 silicon photonics engine.",
    price: 2499,
    originalPrice: 2899,
    category: "Headsets",
    rating: 4.9,
    reviews: 1284,
    accent: "purple",
    badge: "New",
    inStock: true,
    image: img("photo-1622979135225-d2ba269cf1ac"),
    gallery: [
      img("photo-1622979135225-d2ba269cf1ac"),
      img("photo-1592478411213-6153e4ebc07d"),
      img("photo-1626218174358-7769486e2e51"),
    ],
  },
  {
    id: "onyx-controller",
    name: "Onyx Controller",
    tagline: "Zero-latency haptics, machined titanium",
    description:
      "Precision controller engineered for sub-millisecond response. Magnetic snap charging and dual analog photonic sticks.",
    price: 499,
    category: "Controllers",
    rating: 4.8,
    reviews: 932,
    accent: "cyan",
    inStock: true,
    image: img("photo-1592840496694-26d035b52b48"),
    gallery: [img("photo-1592840496694-26d035b52b48")],
  },
  {
    id: "prism-tablet",
    name: "Prism Tablet",
    tagline: "16K micro-OLED creative slate",
    description:
      "A whisper-thin creative tablet with 16K micro-OLED, a quantum stylus, and 14-hour all-day battery.",
    price: 1299,
    category: "Tablets",
    rating: 4.7,
    reviews: 421,
    accent: "rose",
    inStock: true,
    image: img("photo-1561154464-82e9adf32764"),
    gallery: [img("photo-1561154464-82e9adf32764")],
  },
  {
    id: "echo-implants",
    name: "Echo Implants",
    tagline: "Spatial audio earpieces",
    description:
      "Ultra-light spatial audio earpieces with bio-adaptive equalization and lossless transmission.",
    price: 820,
    category: "Audio",
    rating: 4.9,
    reviews: 2104,
    accent: "cyan",
    inStock: true,
    image: img("photo-1606220945770-b5b6c2c55bf1"),
    gallery: [img("photo-1606220945770-b5b6c2c55bf1")],
  },
  {
    id: "chronos-band",
    name: "Chronos Band",
    tagline: "Bio-haptic wristband, sapphire",
    description:
      "A continuous biometrics wristband with sapphire glass face and 7-day battery life.",
    price: 390,
    category: "Wearables",
    rating: 4.6,
    reviews: 678,
    accent: "purple",
    inStock: true,
    image: img("photo-1579586337278-3befd40fd17a"),
    gallery: [img("photo-1579586337278-3befd40fd17a")],
  },
  {
    id: "monolith-slate",
    name: "Monolith Slate",
    tagline: "Modular workstation laptop",
    description:
      "Sixteen-inch modular workstation laptop with hot-swappable cores and a magnetic photonic display.",
    price: 3450,
    category: "Computing",
    rating: 4.8,
    reviews: 312,
    accent: "rose",
    badge: "Limited",
    inStock: true,
    image: img("photo-1517336714731-489689fd1ca8"),
    gallery: [img("photo-1517336714731-489689fd1ca8")],
  },
  {
    id: "halo-lamp",
    name: "Halo Lamp",
    tagline: "Adaptive ambient lighting",
    description:
      "Smart ambient lamp tuned to your circadian rhythm with built-in microphone array.",
    price: 280,
    category: "Ambient",
    rating: 4.5,
    reviews: 144,
    accent: "cyan",
    inStock: true,
    image: img("photo-1565814329452-e1efa11c5b89"),
    gallery: [img("photo-1565814329452-e1efa11c5b89")],
  },
  {
    id: "core-node",
    name: "Core Node",
    tagline: "Edge AI compute brick",
    description:
      "Pocketable edge AI compute brick. 80 TOPS, passively cooled, runs models offline.",
    price: 720,
    category: "Computing",
    rating: 4.7,
    reviews: 256,
    accent: "purple",
    inStock: true,
    image: img("photo-1518770660439-4636190af475"),
    gallery: [img("photo-1518770660439-4636190af475")],
  },
];

export const categories = [
  "Headsets",
  "Controllers",
  "Tablets",
  "Audio",
  "Wearables",
  "Computing",
  "Ambient",
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}
