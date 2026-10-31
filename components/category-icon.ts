import {
  Cpu,
  Footprints,
  Layers,
  LucideIcon,
  Scissors,
  Shirt,
  ShoppingBag,
  Sparkles,
  Tag,
  Wrench,
} from "lucide-react";

/**
 * Returns a fitting Lucide icon for any category name (clothing or general),
 * with safe fallbacks so new dynamic categories always look great.
 */
export function getCategoryIcon(category?: string | null): LucideIcon {
  if (!category) return Shirt;
  const c = category.toLowerCase().trim();

  // Top wear / Garments / Clothes
  if (
    c.includes("shirt") ||
    c.includes("t-shirt") ||
    c.includes("tshirt") ||
    c.includes("polo") ||
    c.includes("top") ||
    c.includes("garment") ||
    c.includes("cloth") ||
    c.includes("hoodie") ||
    c.includes("jacket")
  ) {
    return Shirt;
  }

  // Ethnic / Sarees / Dresses / Festive
  if (
    c.includes("saree") ||
    c.includes("kurti") ||
    c.includes("ethnic") ||
    c.includes("dress") ||
    c.includes("lehenga") ||
    c.includes("suit")
  ) {
    return Sparkles;
  }

  // Bottom wear / Jeans / Lowers / Trousers / Shorts
  if (
    c.includes("lower") ||
    c.includes("pant") ||
    c.includes("jean") ||
    c.includes("trouser") ||
    c.includes("track") ||
    c.includes("short") ||
    c.includes("jogger")
  ) {
    return Scissors;
  }

  // Footwear / Shoes
  if (
    c.includes("footwear") ||
    c.includes("shoe") ||
    c.includes("sneaker") ||
    c.includes("sandal") ||
    c.includes("slipper") ||
    c.includes("boot")
  ) {
    return Footprints;
  }

  // Electronics / Gadgets
  if (
    c.includes("electronic") ||
    c.includes("gadget") ||
    c.includes("cable") ||
    c.includes("charger") ||
    c.includes("light") ||
    c.includes("mobile")
  ) {
    return Cpu;
  }

  // Hardware / Tools / Industrial
  if (
    c.includes("industrial") ||
    c.includes("tool") ||
    c.includes("hardware") ||
    c.includes("part") ||
    c.includes("bolt")
  ) {
    return Wrench;
  }

  // Fallback icon for any custom dynamic category
  return Tag;
}

// Transparent Proxy record: indexing with ANY category string returns a valid icon.
export const categoryIcons: Record<string, LucideIcon> = new Proxy(
  {
    Garments: Shirt,
    Footwear: Footprints,
    Electronics: Cpu,
    "Industrial parts": Wrench,
    "T-Shirts": Shirt,
    Shirts: Shirt,
    "Track Pants & Lowers": Scissors,
    Jeans: Scissors,
    "Sarees & Ethnic": Sparkles,
    Kurtis: Sparkles,
    "Hoodies & Jackets": Shirt,
    Shorts: Scissors,
  } as Record<string, LucideIcon>,
  {
    get(target, prop: string) {
      if (typeof prop !== "string") return Tag;
      if (prop in target) return target[prop];
      return getCategoryIcon(prop);
    },
  }
);
