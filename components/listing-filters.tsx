import Link from "next/link";
import Form from "next/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listingHref, type ListingParams } from "@/lib/listing-params";
import { categories, type Category } from "@/lib/products";
import { cn } from "@/lib/utils";

// Category list and price range for the listing page. Every control is a plain
// link or form, so the filters live in the URL and can be shared or bookmarked.
export function ListingFilters({
  params,
  counts,
}: {
  params: ListingParams;
  counts: Partial<Record<Category, number>>;
}) {
  const allCount = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const hasFilters = params.category !== null || params.min !== null || params.max !== null;

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted",
      active && "bg-muted font-semibold text-primary",
    );

  return (
    <div className="space-y-6">
      <section aria-labelledby="filter-category">
        <h2 id="filter-category" className="font-heading text-sm font-bold tracking-wide uppercase">Category</h2>
        <ul className="mt-2 space-y-0.5">
          <li>
            <Link
              href={listingHref(params, { category: null })}
              aria-current={params.category === null ? "true" : undefined}
              className={linkClass(params.category === null)}
            >
              All categories
              <span className="text-xs text-muted-foreground">{allCount}</span>
            </Link>
          </li>
          {categories.map((c) => {
            const n = counts[c] ?? 0;
            const active = params.category === c;
            if (n === 0 && !active) return null;
            return (
              <li key={c}>
                <Link
                  href={listingHref(params, { category: c })}
                  aria-current={active ? "true" : undefined}
                  className={linkClass(active)}
                >
                  {c}
                  <span className="text-xs text-muted-foreground">{n}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="filter-price">
        <h2 id="filter-price" className="font-heading text-sm font-bold tracking-wide uppercase">Price (₹)</h2>
        <Form action="/products" className="mt-2 space-y-2">
          {params.q && <input type="hidden" name="q" value={params.q} />}
          {params.category && <input type="hidden" name="category" value={params.category} />}
          {params.sort !== "new" && <input type="hidden" name="sort" value={params.sort} />}
          <div className="flex items-center gap-2">
            <Input
              name="min"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Min"
              aria-label="Minimum price in rupees"
              defaultValue={params.min ?? ""}
            />
            <span className="text-muted-foreground" aria-hidden>to</span>
            <Input
              name="max"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Max"
              aria-label="Maximum price in rupees"
              defaultValue={params.max ?? ""}
            />
          </div>
          <Button type="submit" variant="outline" className="w-full">Apply</Button>
        </Form>
      </section>

      {hasFilters && (
        <Link
          href={listingHref(params, { category: null, min: null, max: null })}
          className="inline-block text-sm text-primary underline underline-offset-4"
        >
          Clear all filters
        </Link>
      )}
    </div>
  );
}