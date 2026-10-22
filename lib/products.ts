// Mock data. Replace with prisma.product queries in the next step.
export type Category = "Garments" | "Footwear" | "Electronics" | "Industrial parts";

export type Product = {
  id: string;
  title: string;
  description: string;
  category: Category;
  price: number; // INR
  mrp: number; // INR
  stock: number;
};

export const categories: Category[] = ["Garments", "Footwear", "Electronics", "Industrial parts"];

export const products: Product[] = [
  { id: "cotton-polo-tshirt", title: "Men's cotton polo t-shirt", description: "Soft combed cotton, regular fit, mixed sizes. New with tags.", category: "Garments", price: 185, mrp: 799, stock: 420 },
  { id: "kids-school-shoes", title: "Kids' school shoes, black", description: "Sizes 1 to 5. New, boxed. Discontinued design.", category: "Footwear", price: 240, mrp: 899, stock: 180 },
  { id: "led-batten-20w", title: "20W LED batten light, 4000K", description: "Cool white tube light with 1 year warranty.", category: "Electronics", price: 210, mrp: 650, stock: 650 },
  { id: "ss-hex-bolts-m10", title: "Stainless steel hex bolts M10 x 50 mm", description: "Pack of 100. New, loose packed.", category: "Industrial parts", price: 800, mrp: 2400, stock: 520 },
  { id: "denim-jacket", title: "Women's denim jacket", description: "Autumn range. New, minor carton damage.", category: "Garments", price: 520, mrp: 2199, stock: 95 },
  { id: "usb-c-cable", title: "1 m braided USB-C cable, 3 A", description: "Fast charging and data sync. Retail packed.", category: "Electronics", price: 45, mrp: 399, stock: 1200 },
];

export const getProduct = (id: string) => products.find((p) => p.id === id);

export const discountPct = (p: { price: number; mrp: number }) => Math.round((1 - p.price / p.mrp) * 100);

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);