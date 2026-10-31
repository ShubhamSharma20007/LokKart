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
