import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { categoryIcons } from "@/components/category-icon";
import { FAQSection } from "@/components/faq-section";
import { ProductCard } from "@/components/product-card";
import { getCategorySections, getLatestProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { discountPct, formatINR } from "@/lib/products";

export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b bg-brand text-brand-foreground">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <h1 className="font-heading max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Shop smart, <span className="text-signal">save more.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-brand-foreground/75">
              Trendy clothing, daily fashion, and quality lifestyle products at prices well below MRP. 100% Free Shipping with UPI or Cash on Delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/products"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 bg-signal px-6 text-base font-bold text-signal-foreground hover:bg-signal/90 shadow-sm"
                )}
              >
                Browse All Collections
              </Link>
            </div>
          </div>

          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-foreground/10" aria-hidden />}>
            <FeaturedProduct />
          </Suspense>
        </div>
      </section>

      {/* Trust Highlights */}
      <section className="border-b bg-muted/40">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Clear pricing", body: "MRP and our discount price side by side on every piece." },
            { icon: ShieldCheck, title: "Quality Assured", body: "Brand new with tags, inspected fabric & verified sizing." },
            { icon: Wallet, title: "Pay your way", body: "UPI, Cards, NetBanking or Cash on Delivery at checkout." },
          ].map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Category-Wise Product Rows Section */}
      <section id="products" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-12">
        <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">Explore by Category</h2>
            <p className="text-sm text-muted-foreground">Hand-picked fresh drops sorted by category</p>
          </div>
          <Link
            href="/products"
            className="text-xs sm:text-sm font-semibold text-primary underline underline-offset-4 hover:opacity-80"
          >
            View full catalog {" "}
             <span className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          
        </div>

        <Suspense fallback={<CategorySectionsSkeleton />}>
          <CategoryProductSections />
        </Suspense>
      </section>

      <FAQSection />
    </main>
  );
}

// Row-by-Row Category Showcase Component
async function CategoryProductSections() {
  await connection();
  // Fetch up to 4 products per category
  const sections = await getCategorySections(4);

  // If no products in DB yet, show a clean friendly placeholder
  if (sections.length === 0) {
    return (
      <div className="my-10 rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/40">
        <p className="font-heading text-lg font-semibold">New Collections Coming Soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          We are currently stocking fresh fashion items. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-14">
      {/* Quick Category Jump Navigation (Only categories with products) */}
      {sections.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            Jump to:
          </span>
          {sections.map(({ category, total }) => {
            const Icon = categoryIcons[category];
            const anchorId = `cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
            return (
              <a
                key={category}
                href={`#${anchorId}`}
                className={cn(
                  badgeVariants({ variant: "outline" }),
                  "h-8 gap-1.5 px-3 text-xs sm:text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                )}
              >
                <Icon className="size-3.5 text-muted-foreground" aria-hidden />
                <span>{category}</span>
                <span className="text-[11px] text-muted-foreground font-normal">({total})</span>
              </a>
            );
          })}
        </div>
      )}

      {/* Category Rows */}
      {sections.map(({ category, total, products }) => {
        const Icon = categoryIcons[category];
        const anchorId = `cat-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const hasMore = total >= 4; // User requested: if 4 or more products, show "View all"

        return (
          <section
            key={category}
            id={anchorId}
            className="scroll-mt-20 space-y-4"
          >
            {/* Category Row Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 sm:size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4 sm:size-5" />
                </span>
                <div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    {category}
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {total} {total === 1 ? "piece" : "pieces"}
                    </span>
                  </h2>
                </div>
              </div>

              {hasMore && (
                <Link
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className="group inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-primary hover:underline"
                >
                  View all in {category}
                  <span className="transition-transform group-hover:translate-x-0.5">→</span>
                </Link>
              )}
            </div>

            {/* Products Grid (up to 4 products) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {/* If 4 or more products, show a clean CTA button below the row */}
            {/* {hasMore && (
              <div className="flex justify-center pt-2 sm:justify-end">
                <Link
                  href={`/products?category=${encodeURIComponent(category)}`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "h-8 px-4 text-xs font-semibold shadow-2xs hover:bg-muted"
                  )}
                >
                  View all {total} {category} products →
                </Link>
              </div>
            )} */}
          </section>
        );
      })}
    </div>
  );
}

function CategorySectionsSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-5 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-52 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// The newest product, shown as the hero card. Hidden while the store is empty.
async function FeaturedProduct() {
  await connection();
  const sample = await getLatestProduct();
  if (!sample) return null;

  return (
    <Link href={`/products/${sample.id}`} className="block text-foreground md:rotate-1" aria-label={`View ${sample.title}`}>
      <Card className="border-2 border-dashed border-border shadow-xl transition-transform hover:rotate-0 bg-card overflow-hidden">
        <div className="flex justify-center pt-2">
          <span className="size-3 rounded-full bg-muted ring-2 ring-border" aria-hidden />
        </div>
        <CardContent className="space-y-4 pt-2">
          <Badge variant="secondary" className="text-xs">{sample.category}</Badge>
          <p className="font-heading text-lg font-semibold leading-snug line-clamp-2">{sample.title}</p>
          <Separator />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-muted-foreground line-through">MRP {formatINR(sample.mrp)}</p>
              <p className="font-heading text-4xl font-bold">{formatINR(sample.price)}</p>
            </div>
            <Badge className="bg-signal px-3 py-1 text-base text-signal-foreground font-bold">{discountPct(sample)}% off</Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
