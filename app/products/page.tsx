import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ListingFilters } from "@/components/listing-filters";
import { InfiniteListing } from "@/components/infinite-listing";
import { searchListing } from "@/lib/catalog";
import { SORTS, listingHref, parseListingParams, type ListingParams } from "@/lib/listing-params";
import { formatINR } from "@/lib/products";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "All products",
  description: "Browse garments, footwear, electronics and industrial parts at prices below MRP.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <Suspense fallback={<ListingSkeleton />}>
        <Listing searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Listing({ searchParams }: { searchParams: SearchParams }) {
  // Results depend on the search and on products being added, so render per request.
  await connection();
  const params = parseListingParams(await searchParams);
  const { products, total, page, totalPages, categoryCounts } = await searchListing(params);

  const title = params.q ? `Results for “${params.q}”` : (params.category ?? "All products");


  const chips: { label: string; href: string }[] = [];
  if (params.q) chips.push({ label: `“${params.q}”`, href: listingHref(params, { q: "" }) });
  if (params.category) chips.push({ label: params.category, href: listingHref(params, { category: null }) });
  if (params.min !== null || params.max !== null) {
    const label =
      params.min !== null && params.max !== null
        ? `${formatINR(params.min)} – ${formatINR(params.max)}`
        : params.min !== null
          ? `Over ${formatINR(params.min)}`
          : `Under ${formatINR(params.max as number)}`;
    chips.push({ label, href: listingHref(params, { min: null, max: null }) });
  }

  const filtersCount = [params.category, params.min, params.max].filter((v) => v !== null).length;
  const filters = <ListingFilters params={params} counts={categoryCounts} />;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        {/* <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground" aria-live="polite">
            {total === 0
              ? "No products found"
              : `Showing ${from}–${to} of ${total} ${total === 1 ? "product" : "products"}`}
          </p>
        </div> */}

        <nav aria-label="Sort products" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Sort by</span>
          {SORTS.map((o) => (
            <Link
              key={o.value}
              href={listingHref(params, { sort: o.value })}
              aria-current={params.sort === o.value ? "true" : undefined}
              className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <Badge variant={params.sort === o.value ? "default" : "outline"} className="h-7 cursor-pointer px-3 text-sm">
                {o.label}
              </Badge>
            </Link>
          ))}
        </nav>
      </div>

      {chips.length > 0 && (
        <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.label}>
              <Link href={c.href} aria-label={`Remove filter ${c.label}`}>
                <Badge variant="secondary" className="h-7 gap-1.5 px-3 text-sm hover:bg-muted">
                  {c.label}
                  <X className="size-3.5" aria-hidden />
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <aside aria-label="Filters">
          <details className="rounded-xl border bg-card lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
              Filters{filtersCount > 0 && ` (${filtersCount})`}
            </summary>
            <div className="border-t p-4">{filters}</div>
          </details>
          <div className="hidden lg:block">{filters}</div>
        </aside>

        <section aria-label="Product results" className="min-w-0">
          {total === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <SearchX className="mx-auto size-8 text-muted-foreground" aria-hidden />
              <p className="mt-3 font-medium">
                {params.q ? `We could not find anything for “${params.q}”.` : "No products match these filters."}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Check the spelling, try a more general word, or remove a filter.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {filtersCount > 0 && (
                  <Link
                    href={listingHref(params, { category: null, min: null, max: null })}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Clear filters
                  </Link>
                )}
                <Link href="/products" className={buttonVariants()}>
                  Browse all products
                </Link>
              </div>
            </div>
          ) : (
          <>
            <InfiniteListing
              key={listingHref(params)}
              initialProducts={products}
              params={params}
              initialPage={page}
              totalPages={totalPages}
            />
          </>
          )}
        </section>
      </div>
    </>
  );
}

// 1 … 4 5 [6] 7 8 … 20
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const wanted = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  wanted.forEach((n, i) => {
    if (i > 0 && n - wanted[i - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

function Pagination({ params, page, totalPages }: { params: ListingParams; page: number; totalPages: number }) {
  const item = "h-9 min-w-9 px-3";
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={listingHref(params, { page: page - 1 })} className={cn(buttonVariants({ variant: "outline" }), item)}>
          Previous
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline" }), item, "pointer-events-none opacity-50")} aria-disabled="true">
          Previous
        </span>
      )}

      {pageWindow(page, totalPages).map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
        ) : (
          <Link
            key={n}
            href={listingHref(params, { page: n })}
            aria-current={n === page ? "page" : undefined}
            aria-label={`Page ${n}`}
            className={cn(buttonVariants({ variant: n === page ? "default" : "outline" }), item)}
          >
            {n}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={listingHref(params, { page: page + 1 })} className={cn(buttonVariants({ variant: "outline" }), item)}>
          Next
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline" }), item, "pointer-events-none opacity-50")} aria-disabled="true">
          Next
        </span>
      )}
    </nav>
  );
}

function ListingSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading products">
      <div className="h-8 w-56 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[15rem_1fr]">
        <div className="hidden h-72 animate-pulse rounded-xl bg-muted lg:block" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}