// Dynamic category type supporting extensible store categories
export type Category = string;

export type Product = {
  id: string;
  title: string;
  description: string;
  category: Category;
  price: number; // INR
  mrp: number; // INR
  stock: number;
};

// Standard size presets for garments & footwear
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;
export const WAIST_SIZES = ["28", "30", "32", "34", "36", "38", "40"] as const;
export const FOOTWEAR_SIZES = ["UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11"] as const;

// Common apparel color presets with swatch hex colors
export const CLOTHING_COLORS = [
  { name: "Teal Green", hex: "#0d9488" },
  { name: "Maroon", hex: "#881337" },
  { name: "Purple", hex: "#7e22ce" },
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#f8fafc", border: true },
  { name: "Charcoal", hex: "#1f2937" },
  { name: "Olive Green", hex: "#3f6212" },
  { name: "Bottle Green", hex: "#14532d" },
  { name: "Wine Red", hex: "#4c0519" },
  { name: "Red", hex: "#dc2626" },
  { name: "Mustard Yellow", hex: "#ca8a04" },
  { name: "Lavender", hex: "#c084fc" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Beige", hex: "#f5f5dc", border: true },
  { name: "Brown", hex: "#78350f" },
  { name: "Pink", hex: "#f472b6" },
  { name: "Sky Blue", hex: "#38bdf8" },
] as const;

export function getColorHex(name: string): string {
  const clean = name.trim().toLowerCase();
  const match = CLOTHING_COLORS.find(
    (c) => c.name.toLowerCase() === clean || clean.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(clean)
  );
  if (match) return match.hex;
  if (clean.includes("green") || clean.includes("teal")) return "#0d9488";
  if (clean.includes("red") || clean.includes("maroon") || clean.includes("wine")) return "#881337";
  if (clean.includes("blue") || clean.includes("navy")) return "#111827";
  if (clean.includes("purple") || clean.includes("violet")) return "#7e22ce";
  if (clean.includes("yellow") || clean.includes("mustard")) return "#ca8a04";
  if (clean.includes("black")) return "#111827";
  if (clean.includes("white")) return "#f8fafc";
  if (clean.includes("grey") || clean.includes("gray")) return "#6b7280";
  if (clean.includes("pink")) return "#f472b6";
  if (clean.includes("orange")) return "#ea580c";
  if (clean.includes("brown")) return "#78350f";
  return "#64748b";
}

// Recommended clothing categories for quick selection & presets
export const CLOTHING_CATEGORIES = [
  "T-Shirts",
  "Shirts",
  "Track Pants & Lowers",
  "Jeans",
  "Sarees & Ethnic",
  "Kurtis",
  "Hoodies & Jackets",
  "Shorts",
] as const;

export const categories: string[] = [
  "T-Shirts",
  "Shirts",
  "Track Pants & Lowers",
  "Jeans",
  "Sarees & Ethnic",
  "Kurtis",
  "Hoodies & Jackets",
  "Shorts",
];

export const products: Product[] = [
  { id: "cotton-polo-tshirt", title: "Men's cotton polo t-shirt", description: "Soft combed cotton, regular fit, mixed sizes. New with tags.", category: "T-Shirts", price: 185, mrp: 799, stock: 420 },
  { id: "denim-jacket", title: "Women's denim jacket", description: "Autumn range. New, premium quality.", category: "Hoodies & Jackets", price: 520, mrp: 2199, stock: 95 },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);

export const discountPct = (p: { price: number; mrp: number }) => Math.round((1 - p.price / p.mrp) * 100);

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
