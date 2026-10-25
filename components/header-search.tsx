"use client";

import { Suspense, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductImage } from "@/components/product-image";
import { EMPTY_LISTING, listingHref } from "@/lib/listing-params";
import { formatINR } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Suggestion = Pick<StoreProduct, "id" | "title" | "category" | "price" | "imageUrl">;

// Picking a suggestion, or pressing Enter, opens the product listing page for that search.
const searchHref = (q: string) => listingHref(EMPTY_LISTING, { q });

export function HeaderSearch() {
  return (
    <Suspense fallback={<div className="h-9 w-full rounded-lg bg-muted/60" aria-hidden />}>
      <SearchFromUrl />
    </Suspense>
  );
}

// Keeps the box in step with the page: shows the current search on /products, empty elsewhere.
function SearchFromUrl() {
  const pathname = usePathname();
  const params = useSearchParams();
  const q = pathname === "/products" ? (params.get("q") ?? "") : "";
  return <SearchBox key={q} initialQuery={q} />;
}

function Highlight({ text, term }: { text: string; term: string }) {
  const i = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold">{text.slice(i, i + term.length)}</strong>
      {text.slice(i + term.length)}
    </>
  );
}

function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ term: string; items: Suggestion[] } | null>(null);

  const term = value.trim();
  const items = result?.items ?? [];
  const settled = result?.term === term;
  const show = open && term.length >= 2;
  const rowCount = items.length + 1; // the suggestions, plus "See all results"

  // Ask the server for matches 250 ms after the shopper stops typing.
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data: { products: Suggestion[] } = await res.json();
        setResult({ term, items: data.products.slice(0, 5) });
        setActive(-1);
      } catch {
        if (!ctrl.signal.aborted) setResult({ term, items: [] });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [term]);

  // Close the list when clicking anywhere else.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const go = (href: string) => {
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    router.push(href);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (active >= 0 && active < items.length) go(searchHref(items[active].title));
    else go(term ? searchHref(term) : "/products");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (term.length < 2) return;
      e.preventDefault();
      setOpen(true);
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % rowCount : a <= 0 ? rowCount - 1 : a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const rowClass = (i: number) =>
    cn("flex items-center gap-3 px-3 py-2 text-sm outline-none", active === i ? "bg-muted" : "hover:bg-muted/60");

  return (
    <div ref={rootRef} className="relative w-full">
      <form role="search" onSubmit={onSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          ref={inputRef}
          type="text"
          role="combobox"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search for products"
          aria-label="Search products"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          className="h-9 pr-9 pl-9"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue("");
              setOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </form>

      {show && (
        <div className="absolute inset-x-0 top-full z-40 mt-1.5 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
          <p className="sr-only" aria-live="polite">
            {!settled ? "Searching" : items.length === 0 ? "No matching products" : `${items.length} suggestions`}
          </p>

          {items.length === 0 && (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {settled ? `No products found for “${term}”` : "Searching..."}
            </p>
          )}

          <ul id={listId} role="listbox" aria-label="Product suggestions">
            {items.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Link
                  href={searchHref(p.title)}
                  prefetch={false}
                  tabIndex={-1}
                  onClick={() => {
                    setOpen(false);
                    setActive(-1);
                  }}
                  className={rowClass(i)}
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-primary/60">
                    <ProductImage product={p} width={96} iconClassName="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">
                      <Highlight text={p.title} term={term} />
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">in {p.category}</span>
                  </span>
                  <span className="shrink-0 font-medium">{formatINR(p.price)}</span>
                </Link>
              </li>
            ))}

            <li
              id={`${listId}-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              onMouseEnter={() => setActive(items.length)}
              onMouseDown={(e) => e.preventDefault()}
              className={cn(items.length > 0 && "border-t")}
            >
              <Link
                href={searchHref(term)}
                prefetch={false}
                tabIndex={-1}
                onClick={() => {
                  setOpen(false);
                  setActive(-1);
                }}
                className={cn(rowClass(items.length), "font-medium text-primary")}
              >
                <Search className="size-4 shrink-0" aria-hidden />
                <span className="truncate">See all results for “{term}”</span>
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}