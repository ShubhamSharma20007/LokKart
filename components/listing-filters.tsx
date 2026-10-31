import Link from "next/link";
import Form from "next/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listingHref, type ListingParams } from "@/lib/listing-params";
import type { Category } from "@/lib/products";
import { categoryIcons } from "@/components/category-icon";
import { cn } from "@/lib/utils";

// Category list and price range for the listing page. Every control is a plain
// link or form, so the filters live in the URL and can be shared or bookmarked.
export function ListingFilters({
  params,
  counts,
}: {
  params: ListingParams;
  counts: Record<string, number>;
}) {
  const allCount = Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
  const hasFilters = params.category !== null || params.min !== null || params.max !== null;

  // Dynamically collect only categories that have products or are actively selected
  const categoryList = Array.from(
    new Set([
      ...Object.keys(counts),
      ...(params.category ? [params.category] : []),
    ])
  ).filter(Boolean);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
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
              <span className="font-medium">All categories</span>
              <span className="text-xs text-muted-foreground">{allCount}</span>
            </Link>
          </li>
          {categoryList.map((c) => {
            const n = counts[c] ?? 0;
            const active = params.category === c;
            if (n === 0 && !active) return null;
            const Icon = categoryIcons[c];
            return (
              <li key={c}>
                <Link
                  href={listingHref(params, { category: c })}
                  aria-current={active ? "true" : undefined}
                  className={linkClass(active)}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{c}</span>
                  </span>
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
              type="number"
              name="min"
              min={0}
              defaultValue={params.min ?? ""}
              placeholder="Min"
              aria-label="Minimum price in rupees"
              className="h-8 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="number"
              name="max"
              min={0}
              defaultValue={params.max ?? ""}
              placeholder="Max"
              aria-label="Maximum price in rupees"
              className="h-8 text-xs"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary" className="h-8 w-full text-xs">
            Apply price
          </Button>
        </Form>
      </section>

      {hasFilters && (
        <section>
          <Link
            href={listingHref(params, { category: null, min: null, max: null })}
            replace
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "h-8 w-full text-xs text-muted-foreground hover:text-foreground"
            )}
          >
            Clear all filters
          </Link>
        </section>
      )}
    </div>
  );
}
