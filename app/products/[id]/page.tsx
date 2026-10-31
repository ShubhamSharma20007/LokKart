import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft, BadgeCheck, Truck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AddToCart } from "@/components/add-to-cart";
import { ProductCard } from "@/components/product-card";
import { ProductGallery } from "@/components/product-gallery";
import { StockBadge } from "@/components/stock-badge";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalog";
import { formatINR } from "@/lib/products";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const p = await getStoreProduct(id);
  return p ? { title: p.title, description: p.description } : { title: "Product not found" };
}

export default function ProductPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All products
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({ params }: Props) {
  // Stock and price change, so always read the current product.
  await connection();
  const { id } = await params;
  const product = await getStoreProduct(id);
  // Unknown product ids render app/not-found.tsx, which redirects to "/".
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);

  return (
    <>
      <div className="mt-6 grid gap-8 md:grid-cols-[400px_1fr] lg:grid-cols-[440px_1fr] lg:gap-12 items-start">
        {/* Interactive Multi-Image Gallery */}
        <ProductGallery product={product} />

        <div className="space-y-5">
          <div className="space-y-2">
            <Badge variant="secondary" className="text-xs px-2.5 py-0.5">{product.category}</Badge>
            <h1 className="font-heading text-xl font-bold leading-snug tracking-tight sm:text-2xl text-foreground">
              {product.title}
            </h1>
            {product.description && (
              <p className="max-w-prose text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-wrap items-baseline gap-2.5">
              <span className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {formatINR(product.price)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground line-through font-medium">
                MRP {formatINR(product.mrp)}
              </span>
              {product.mrp > product.price && (
                <span className="ml-auto rounded-md bg-[#fcc618] px-2 py-0.5 text-xs font-bold text-black shadow-xs">
                  Save {formatINR(product.mrp - product.price)}
                </span>
              )}
            </div>
            <div><StockBadge stock={product.stock} /></div>
            <div className="pt-2"><AddToCart product={product} buyNow /></div>
          </div>

          <ul className="space-y-2.5 rounded-xl border border-border/40 bg-muted/20 p-4 text-xs sm:text-sm">
            {[
              { icon: BadgeCheck, text: "MRP and our price shown side by side" },
              { icon: Wallet, text: "Pay with UPI or Cash on Delivery" },
              { icon: Truck, text: "Delivered to your address after we confirm the order" },
            ].map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-muted-foreground">
                <I className="size-4 shrink-0 text-primary" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14 border-t border-border/40 pt-8" aria-labelledby="related">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 id="related" className="font-heading text-xl font-bold tracking-tight text-foreground">
                You may also like
              </h2>
              <p className="text-xs text-muted-foreground">More recommendations from {product.category}</p>
            </div>
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-xs sm:text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              See all in {product.category} →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[400px_1fr] lg:grid-cols-[440px_1fr] lg:gap-12 items-start">
      <div className="aspect-square max-h-[440px] w-full animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
