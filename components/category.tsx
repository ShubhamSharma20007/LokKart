import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { categories, type Category } from "@/lib/products";
import type { ListingParams, ListingSort } from "@/lib/listing-params";

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

// ---------- Search ----------

const ci = "insensitive" as const;
const asc = "asc" as const;
const desc = "desc" as const;

// Every word the shopper typed must appear in the title or category
// (and the description too, on the full results page).
function matchWhere(q: string, includeDescription: boolean) {
  const words = q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((w) => w.slice(0, 40));

  return {
    AND: words.map((w) => ({
      OR: [
        { title: { contains: w, mode: ci } },
        { category: { contains: w, mode: ci } },
        ...(includeDescription ? [{ description: { contains: w, mode: ci } }] : []),
      ],
    })),
  };
}

// For the header search box: at most 5 products, best title matches first.
export async function suggestProducts(q: string, limit = 5): Promise<StoreProduct[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const rows = await prisma.product.findMany({
    where: matchWhere(needle, false),
    select,
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const rank = (title: string) => {
    const t = title.toLowerCase();
    if (t.startsWith(needle)) return 0;
    if (t.split(/\s+/).some((w) => w.startsWith(needle))) return 1;
    return t.includes(needle) ? 2 : 3;
  };

  // sort() is stable, so equally ranked products stay newest first.
  return keep(rows)
    .sort((a, b) => rank(a.title) - rank(b.title))
    .slice(0, limit);
}

// ---------- Listing page ----------

export const PAGE_SIZE = 12;

export type ListingResult = {
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  // How many products each category has for the current search and price range.
  categoryCounts: Partial<Record<Category, number>>;
};

function orderFor(sort: ListingSort) {
  if (sort === "price-asc") return [{ price: asc }, { id: asc }];
  if (sort === "price-desc") return [{ price: desc }, { id: asc }];
  return [{ createdAt: desc }, { id: asc }];
}

export async function searchListing(p: ListingParams): Promise<ListingResult> {
  const priceFilter =
    p.min !== null || p.max !== null
      ? { price: { ...(p.min !== null ? { gte: p.min } : {}), ...(p.max !== null ? { lte: p.max } : {}) } }
      : {};
  const base = { ...matchWhere(p.q, true), ...priceFilter };
  const where = p.category ? { ...base, category: p.category } : base;

  const [total, groups] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.groupBy({ by: ["category"], where: base, _count: { _all: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(p.page, totalPages);

  const rows =
    total === 0
      ? []
      : await prisma.product.findMany({
          where,
          select,
          orderBy: orderFor(p.sort),
          skip: (page - 1) * PAGE_SIZE,
          take: PAGE_SIZE,
        });

  const categoryCounts: Partial<Record<Category, number>> = {};
  for (const g of groups) {
    if ((categories as readonly string[]).includes(g.category)) {
      categoryCounts[g.category as Category] = g._count._all;
    }
  }

  return { products: keep(rows), total, page, totalPages, categoryCounts };
}