import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { categories, type Category } from "@/lib/products";

// The shape the storefront components work with. Everything is a plain value,
// so it can be passed from server components to client components.
export type StoreProduct = {
  id: string;
  title: string;
  description: string;
  category: Category;
  price: number;
  mrp: number;
  stock: number;
  imageUrl: string | null;
};

type Row = Omit<StoreProduct, "category"> & { category: string };

const select = {
  id: true,
  title: true,
  description: true,
  category: true,
  price: true,
  mrp: true,
  stock: true,
  imageUrl: true,
} as const;

// A row whose category isn't one of the store's categories has no icon or filter,
// so it is skipped (and logged) instead of breaking the page.
function toStoreProduct(row: Row): StoreProduct | null {
  if (!(categories as readonly string[]).includes(row.category)) {
    console.warn(`Product ${row.id} skipped: unknown category "${row.category}"`);
    return null;
  }
  return { ...row, category: row.category as Category };
}

const keep = (rows: Row[]): StoreProduct[] =>
  rows.flatMap((r) => {
    const p = toStoreProduct(r);
    return p ? [p] : [];
  });

// Newest first. cache() makes repeat calls within one request share a single query.
export const listProducts = cache(async (): Promise<StoreProduct[]> => {
  const rows = await prisma.product.findMany({ select, orderBy: { createdAt: "desc" } });
  return keep(rows);
});

export const getStoreProduct = cache(async (id: string): Promise<StoreProduct | null> => {
  const row = await prisma.product.findUnique({ where: { id }, select });
  return row ? toStoreProduct(row) : null;
});

// Same category first, then newest from other categories, never the product itself.
export async function getRelatedProducts(product: StoreProduct, limit = 3): Promise<StoreProduct[]> {
  const same = await prisma.product.findMany({
    where: { category: product.category, id: { not: product.id } },
    select,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  const rows = [...same];

  if (rows.length < limit) {
    const others = await prisma.product.findMany({
      where: { category: { not: product.category }, id: { not: product.id } },
      select,
      orderBy: { createdAt: "desc" },
      take: limit - rows.length,
    });
    rows.push(...others);
  }
  return keep(rows);
}