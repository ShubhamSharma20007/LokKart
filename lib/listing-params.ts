import { categories, type Category } from "@/lib/products";

// Safe to import from client components: no database code in here.

export type ListingSort = "new" | "price-asc" | "price-desc";

export const SORTS: { value: ListingSort; label: string }[] = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export type ListingParams = {
  q: string;
  category: Category | null;
  min: number | null;
  max: number | null;
  sort: ListingSort;
  page: number;
};

export const EMPTY_LISTING: ListingParams = { q: "", category: null, min: null, max: null, sort: "new", page: 1 };

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

const toPrice = (v: string | string[] | undefined): number | null => {
  const s = first(v)?.trim();
  return s && /^\d{1,9}$/.test(s) ? Number(s) : null;
};

// Turns the URL's query string into safe, validated listing settings.
export function parseListingParams(raw: Raw): ListingParams {
  const q = (first(raw.q) ?? "").replace(/\s+/g, " ").trim().slice(0, 80);

  const cat = first(raw.category);
  const category = cat && (categories as readonly string[]).includes(cat) ? (cat as Category) : null;

  let min = toPrice(raw.min);
  let max = toPrice(raw.max);
  if (min !== null && max !== null && min > max) [min, max] = [max, min];

  const s = first(raw.sort);
  const sort = SORTS.some((o) => o.value === s) ? (s as ListingSort) : "new";

  const p = first(raw.page);
  const page = p && /^\d{1,6}$/.test(p) && Number(p) >= 1 ? Number(p) : 1;

  return { q, category, min, max, sort, page };
}

// Builds a /products link. Changing any filter or the sort goes back to page 1,
// unless the change itself sets a page.
export function listingHref(base: ListingParams, change: Partial<ListingParams> = {}): string {
  const p = { ...base, page: 1, ...change };
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.category) sp.set("category", p.category);
  if (p.min !== null) sp.set("min", String(p.min));
  if (p.max !== null) sp.set("max", String(p.max));
  if (p.sort !== "new") sp.set("sort", p.sort);
  if (p.page > 1) sp.set("page", String(p.page));
  const s = sp.toString();
  return s ? `/products?${s}` : "/products";
}