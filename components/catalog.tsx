"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/product-card";
import { categories, type Category } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";

export function Catalog({
  products,
  heading = "Products",
  initialCategory = "All",
}: {
  products: StoreProduct[];
  heading?: string;
  initialCategory?: Category | "All";
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">(initialCategory);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter(
      (p) =>
        (category === "All" || p.category === category) &&
        (!q || `${p.title} ${p.category}`.toLowerCase().includes(q)),
    );
  }, [products, query, category]);

  const filtered = query.trim() !== "" || category !== "All";
  const reset = () => {
    setQuery("");
    setCategory("All");
  };

  return (
    <section id="products" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold tracking-tight">{heading}</h2>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {visible.length} {visible.length === 1 ? "product" : "products"}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No products yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">New products will show up here as soon as they are added.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:max-w-sm sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products"
                aria-label="Search products"
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
              {(["All", ...categories] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Badge variant={category === c ? "default" : "outline"} className="h-7 cursor-pointer px-3 text-sm">
                    {c}
                  </Badge>
                </button>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No products match your search.</p>
              <p className="mt-1 text-sm text-muted-foreground">Try a different word or pick another category.</p>
              {filtered && (
                <Button variant="outline" className="mt-4" onClick={reset}>
                  <X aria-hidden /> Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}