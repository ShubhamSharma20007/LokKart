import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { categoryIcons } from "@/components/category-icon";
import { InfiniteProducts } from "@/components/infinity-products";
import { FAQSection } from "@/components/faq-section";
import { getActiveCategories, getLatestProduct, listProductsPage } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { discountPct, formatINR } from "@/lib/products";

export default function Home() {
  return (
    <main>
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
                Browse Collections
              </Link>
            </div>
          </div>

          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-brand-foreground/10" aria-hidden />}>
            <FeaturedProduct />
          </Suspense>
        </div>
      </section>

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

      <section id="products" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-12">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">Explore Categories</h2>
            <p className="text-sm text-muted-foreground">Fresh drops and trending styles</p>
          </div>
          <Link href="/products" className="text-sm font-medium text-primary underline underline-offset-4 hover:opacity-80">
            View all products →
          </Link>
        </div>

        <Suspense fallback={<div className="mt-4 flex gap-2"><div className="h-8 w-24 animate-pulse rounded-md bg-muted/40" /><div className="h-8 w-24 animate-pulse rounded-md bg-muted/40" /></div>}>
          <CategoryPills />
        </Suspense>

        <div className="mt-8">
          <Suspense fallback={<CatalogSkeleton />}>
            <LatestProducts />
          </Suspense>
        </div>
      </section>

      <FAQSection />
    </main>
  );
}

// Streamed category pills based on active products in database
async function CategoryPills() {
  await connection();
  const activeCategories = await getActiveCategories();
  if (activeCategories.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Shop by category">
      {activeCategories.map((c) => {
        const Icon = categoryIcons[c];
        return (
          <Link
            key={c}
            href={`/products?category=${encodeURIComponent(c)}`}
            className={cn(
              badgeVariants({ variant: "outline" }),
              "h-8 gap-1.5 px-3 text-sm font-medium hover:bg-muted transition-colors"
            )}
          >
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
            {c}
          </Link>
        );
      })}
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
          {/* {sample.imageUrl && (
            <div className="relative h-44 w-full overflow-hidden rounded-lg bg-muted/20">
              <img
                src={sample.imageUrl}
                alt={sample.title}
                className="h-full w-full object-contain"
              />
            </div>
          )} */}
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

// Only the first page is fetched here. The rest loads as the shopper scrolls.
async function LatestProducts() {
  await connection();
  const { products, nextCursor } = await listProductsPage();
  return <InfiniteProducts initialProducts={products} initialCursor={nextCursor} />;
}
