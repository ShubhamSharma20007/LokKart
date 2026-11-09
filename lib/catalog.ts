import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { rememberCache, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";
import type { Category } from "@/lib/products";
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
  images: string[];
  sizes: string[];
  colors: string[];
};

type Row = Omit<StoreProduct, "category"> & { category: string };

const asc = "asc" as const;
const desc = "desc" as const;

const select = {
  id: true,
  title: true,
  description: true,
  category: true,
  price: true,
  mrp: true,
  stock: true,
  imageUrl: true,
  images: true,
  sizes: true,
  colors: true,
} as const;

// Accepts any dynamic category stored in the database without skipping.
function toStoreProduct(row: Row): StoreProduct {
  const category = (row.category && row.category.trim()) || "Clothing";
  const images =
    row.images && row.images.length > 0
      ? row.images
      : row.imageUrl
      ? [row.imageUrl]
      : [];
  const sizes = Array.isArray(row.sizes) ? row.sizes : [];
  const colors = Array.isArray(row.colors) ? row.colors : [];
  return { ...row, category, images, sizes, colors };
}

const keep = (rows: Row[]): StoreProduct[] => rows.map(toStoreProduct);

export const HOME_PAGE_SIZE = 12;

export type CategorySectionData = {
  category: string;
  total: number;
  products: StoreProduct[];
};

// Fetch products grouped by category for the landing page (only categories with >= 1 product)
export const getCategorySections = cache(async (limitPerCategory = 4): Promise<CategorySectionData[]> => {
  return rememberCache(CACHE_KEYS.catalogSections(limitPerCategory), CACHE_TTL.CATALOG_SECTIONS, async () => {
    try {
      const groups = await prisma.product.groupBy({
        by: ["category"],
        _count: { _all: true },
        where: { stock: { gte: 0 } },
        orderBy: { category: "asc" },
      });

      // Only categories that have at least 1 product
      const active = groups.filter((g) => g.category && g._count._all > 0);
      if (active.length === 0) return [];

      const sections = await Promise.all(
        active.map(async (g) => {
          const rows = await prisma.product.findMany({
            where: { category: g.category },
            select,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: limitPerCategory,
          });

          return {
            category: g.category,
            total: g._count._all,
            products: keep(rows),
          };
        })
      );

      return sections;
    } catch (err) {
      console.error("Failed to fetch category sections", err);
      return [];
    }
  });
});

// Fetch all distinct categories currently active in the database (only categories with products)
export const getActiveCategories = cache(async (): Promise<string[]> => {
  return rememberCache(CACHE_KEYS.activeCategories(), CACHE_TTL.ACTIVE_CATEGORIES, async () => {
    try {
      const distinct = await prisma.product.findMany({
        distinct: ["category"],
        select: { category: true },
        where: { stock: { gte: 0 } },
        orderBy: { category: "asc" },
      });
      return distinct.map((d) => d.category.trim()).filter(Boolean);
    } catch (err) {
      console.error("Failed to fetch active categories", err);
      return [];
    }
  });
});

// Newest first, one page at a time. The cursor is the id of the last product already
// shown, so a product added while someone scrolls never causes repeats or gaps.
export async function listProductsPage(
  opts: { cursor?: string | null; limit?: number } = {},
): Promise<{ products: StoreProduct[]; nextCursor: string | null }> {
  const limit = opts.limit ?? HOME_PAGE_SIZE;
  const rows = await prisma.product.findMany({
    select,
    orderBy: [{ createdAt: desc }, { id: asc }],
    take: limit + 1, // one extra row tells us whether another page exists
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return { products: keep(page), nextCursor: hasMore ? page[page.length - 1].id : null };
}

// The newest product, for the home page hero card.
export const getLatestProduct = cache(async (): Promise<StoreProduct | null> => {
  return rememberCache(CACHE_KEYS.latestProduct(), CACHE_TTL.LATEST_PRODUCT, async () => {
    const { products } = await listProductsPage({ limit: 10 });
    if (products.length === 0) return null;
    const randomProduct = Math.floor(Math.random() * products.length);
    return products[randomProduct] ?? null;
  });
});

export const getStoreProduct = cache(async (id: string): Promise<StoreProduct | null> => {
  return rememberCache(CACHE_KEYS.product(id), CACHE_TTL.PRODUCT, async () => {
    const row = await prisma.product.findUnique({ where: { id }, select });
    return row ? toStoreProduct(row) : null;
  });
});

// Same category first, then newest from other categories, never the product itself.
export async function getRelatedProducts(product: StoreProduct, limit = 3): Promise<StoreProduct[]> {
  return rememberCache(CACHE_KEYS.relatedProducts(product.id, limit), CACHE_TTL.RELATED_PRODUCTS, async () => {
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
  });
}

// ---------- Search ----------

const ci = "insensitive" as const;

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
  categoryCounts: Record<string, number>;
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

  const categoryCounts: Record<string, number> = {};
  for (const g of groups) {
    if (g.category) {
      categoryCounts[g.category] = g._count._all;
    }
  }

  return { products: keep(rows), total, page, totalPages, categoryCounts };
}

// Curated fallback products matching Figma Shop.co layout if database is empty
const FIGMA_NEW_ARRIVALS: StoreProduct[] = [
  {
    id: "t-shirt-with-tape-details",
    title: "T-shirt with Tape Details",
    description: "Graphic casual cotton t-shirt with signature tape details.",
    category: "T-Shirts",
    price: 120,
    mrp: 120,
    stock: 50,
    imageUrl: null,
    images: [],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Black"],
  },
  {
    id: "skinny-fit-jeans",
    title: "Skinny Fit Jeans",
    description: "Slim and tapered stretch blue denim jeans.",
    category: "Jeans",
    price: 240,
    mrp: 260,
    stock: 35,
    imageUrl: null,
    images: [],
    sizes: ["30", "32", "34", "36"],
    colors: ["Blue"],
  },
  {
    id: "checkered-shirt",
    title: "Checkered Shirt",
    description: "Classic red and blue flannel checkered button-down shirt.",
    category: "Shirts",
    price: 180,
    mrp: 180,
    stock: 40,
    imageUrl: null,
    images: [],
    sizes: ["M", "L", "XL"],
    colors: ["Red", "Black"],
  },
  {
    id: "sleeve-striped-t-shirt",
    title: "Sleeve Striped T-shirt",
    description: "Sporty raglan contrast sleeve striped round neck t-shirt.",
    category: "T-Shirts",
    price: 130,
    mrp: 160,
    stock: 60,
    imageUrl: null,
    images: [],
    sizes: ["S", "M", "L"],
    colors: ["Orange", "Black"],
  },
];

const FIGMA_TOP_SELLING: StoreProduct[] = [
  {
    id: "vertical-striped-shirt",
    title: "Vertical Striped Shirt",
    description: "Premium cotton vertical striped mandarin collar casual shirt.",
    category: "Shirts",
    price: 212,
    mrp: 232,
    stock: 45,
    imageUrl: null,
    images: [],
    sizes: ["M", "L", "XL"],
    colors: ["Olive Green"],
  },
  {
    id: "courage-graphic-t-shirt",
    title: "Courage Graphic T-shirt",
    description: "Bold typography front print oversized street t-shirt.",
    category: "T-Shirts",
    price: 145,
    mrp: 145,
    stock: 75,
    imageUrl: null,
    images: [],
    sizes: ["S", "M", "L", "XL"],
    colors: ["Orange"],
  },
  {
    id: "loose-fit-bermuda-shorts",
    title: "Loose Fit Bermuda Shorts",
    description: "Washed denim loose fit knee-length bermuda shorts.",
    category: "Shorts",
    price: 80,
    mrp: 80,
    stock: 30,
    imageUrl: null,
    images: [],
    sizes: ["30", "32", "34"],
    colors: ["Sky Blue"],
  },
  {
    id: "faded-skinny-jeans",
    title: "Faded Skinny Jeans",
    description: "Dark grey acid-wash distressed stretch skinny jeans.",
    category: "Jeans",
    price: 210,
    mrp: 210,
    stock: 50,
    imageUrl: null,
    images: [],
    sizes: ["30", "32", "34", "36"],
    colors: ["Black", "Grey"],
  },
];

export const getNewArrivals = cache(async (limit = 4): Promise<StoreProduct[]> => {
  try {
    const rows = await prisma.product.findMany({
      where: { stock: { gte: 0 } },
      select,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: limit,
    });
    const kept = keep(rows);
    if (kept.length >= limit) return kept;
    return [...kept, ...FIGMA_NEW_ARRIVALS.slice(0, limit - kept.length)];
  } catch (err) {
    console.error("Failed to fetch new arrivals", err);
    return FIGMA_NEW_ARRIVALS.slice(0, limit);
  }
});

export const getTopSelling = cache(async (limit = 4): Promise<StoreProduct[]> => {
  try {
    const rows = await prisma.product.findMany({
      where: { stock: { gte: 0 } },
      select,
      orderBy: [{ price: "desc" }, { createdAt: "asc" }, { id: "asc" }],
      take: limit,
    });
    const kept = keep(rows);
    if (kept.length >= limit) return kept;
    return [...kept, ...FIGMA_TOP_SELLING.slice(0, limit - kept.length)];
  } catch (err) {
    console.error("Failed to fetch top selling", err);
    return FIGMA_TOP_SELLING.slice(0, limit);
  }
});
