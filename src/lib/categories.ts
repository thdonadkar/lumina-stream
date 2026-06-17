// Hierarchical category reference. Mirrors the rows seeded in the database
// (table: public.categories). Used for fast client-side render of the mega
// menu, category cards, and breadcrumbs without a round-trip.
import {
  Cpu,
  Shirt,
  Sofa,
  Sparkles,
  Dumbbell,
  BookOpen,
  ShoppingBasket,
  ToyBrick,
  Car,
  type LucideIcon,
} from "lucide-react";

export type CategoryNode = {
  slug: string;
  name: string;
  icon: LucideIcon;
  image: string;
  accent: "cyan" | "purple" | "rose";
  blurb: string;
  subs: { slug: string; name: string }[];
};

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`;

export const CATEGORIES: CategoryNode[] = [
  {
    slug: "electronics",
    name: "Electronics",
    icon: Cpu,
    image: img("photo-1518770660439-4636190af475"),
    accent: "cyan",
    blurb: "Phones, laptops, audio, wearables, cameras.",
    subs: [
      { slug: "phones", name: "Smartphones" },
      { slug: "laptops", name: "Laptops" },
      { slug: "audio", name: "Audio" },
      { slug: "wearables", name: "Wearables" },
      { slug: "cameras", name: "Cameras" },
    ],
  },
  {
    slug: "fashion",
    name: "Fashion",
    icon: Shirt,
    image: img("photo-1483985988355-763728e1935b"),
    accent: "rose",
    blurb: "Curated essentials for men, women & beyond.",
    subs: [
      { slug: "mens", name: "Men" },
      { slug: "womens", name: "Women" },
      { slug: "shoes", name: "Shoes" },
      { slug: "accessories", name: "Accessories" },
    ],
  },
  {
    slug: "home-furniture",
    name: "Home & Furniture",
    icon: Sofa,
    image: img("photo-1555041469-a586c61ea9bc"),
    accent: "purple",
    blurb: "Designed objects for the spaces you live in.",
    subs: [
      { slug: "living", name: "Living Room" },
      { slug: "bedroom", name: "Bedroom" },
      { slug: "lighting", name: "Lighting" },
      { slug: "kitchen", name: "Kitchen" },
    ],
  },
  {
    slug: "beauty",
    name: "Beauty & Personal Care",
    icon: Sparkles,
    image: img("photo-1522335789203-aabd1fc54bc9"),
    accent: "rose",
    blurb: "Skincare, makeup, fragrance.",
    subs: [
      { slug: "skincare", name: "Skincare" },
      { slug: "makeup", name: "Makeup" },
      { slug: "fragrance", name: "Fragrance" },
    ],
  },
  {
    slug: "sports",
    name: "Sports & Fitness",
    icon: Dumbbell,
    image: img("photo-1517836357463-d25dfeac3438"),
    accent: "cyan",
    blurb: "Train harder, move further.",
    subs: [
      { slug: "gym", name: "Gym" },
      { slug: "outdoor", name: "Outdoor" },
      { slug: "yoga", name: "Yoga" },
    ],
  },
  {
    slug: "books",
    name: "Books",
    icon: BookOpen,
    image: img("photo-1512820790803-83ca734da794"),
    accent: "purple",
    blurb: "Fiction, science, business.",
    subs: [
      { slug: "fiction", name: "Fiction" },
      { slug: "tech", name: "Tech & Science" },
      { slug: "business", name: "Business" },
    ],
  },
  {
    slug: "grocery",
    name: "Grocery",
    icon: ShoppingBasket,
    image: img("photo-1542838132-92c53300491e"),
    accent: "cyan",
    blurb: "Pantry, beverages, fresh.",
    subs: [
      { slug: "snacks", name: "Snacks" },
      { slug: "beverages", name: "Beverages" },
      { slug: "fresh", name: "Fresh" },
    ],
  },
  {
    slug: "toys",
    name: "Toys",
    icon: ToyBrick,
    image: img("photo-1558877385-8c1b8e35d6c8"),
    accent: "rose",
    blurb: "Imagination, on demand.",
    subs: [
      { slug: "kids", name: "Kids" },
      { slug: "collectibles", name: "Collectibles" },
    ],
  },
  {
    slug: "automotive",
    name: "Automotive",
    icon: Car,
    image: img("photo-1492144534655-ae79c964c9d7"),
    accent: "purple",
    blurb: "Accessories and tools.",
    subs: [
      { slug: "accessories-auto", name: "Accessories" },
      { slug: "tools", name: "Tools" },
    ],
  },
];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
