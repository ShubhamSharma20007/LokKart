import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Truck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AddToCart } from "@/components/add-to-cart";
import { categoryIcons } from "@/components/category-icon";
import { ProductCard } from "@/components/product-card";
import { StockBadge } from "@/components/stock-badge";
import { discountPct, formatINR, getProduct, products } from "@/lib/products";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = getProduct(id);
  return p ? { title: p.title, description: p.description } : { title: "Product not found" };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();

  const Icon = categoryIcons[product.category];
  const related = [
    ...products.filter((p) => p.category === product.category && p.id !== product.id),
    ...products.filter((p) => p.category !== product.category),
  ].slice(0, 3);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All products
      </Link>

      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <div className="relative flex aspect-square items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/[0.03] text-primary/60 md:sticky md:top-20 md:self-start">
          <Icon className="size-28" aria-hidden />
          <Badge variant="signal" className="absolute top-4 right-4 h-7 px-3 text-base font-bold">
            {discountPct(product)}% off
          </Badge>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <Badge variant="secondary">{product.category}</Badge>
            <h1 className="font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.title}</h1>
            <p className="max-w-prose text-muted-foreground">{product.description}</p>
          </div>

          <div className="space-y-2 rounded-xl border bg-card p-5">
            <p className="flex flex-wrap items-baseline gap-3">
              <span className="font-heading text-4xl font-extrabold tracking-tight">{formatINR(product.price)}</span>
              <span className="text-muted-foreground line-through">MRP {formatINR(product.mrp)}</span>
            </p>
            <p className="text-sm font-medium text-primary">You save {formatINR(product.mrp - product.price)} per piece</p>
            <div className="pt-1"><StockBadge stock={product.stock} /></div>
            <div className="pt-3"><AddToCart product={product} buyNow /></div>
          </div>

          <ul className="space-y-3 text-sm">
            {[
              { icon: BadgeCheck, text: "MRP and our price shown side by side" },
              { icon: Wallet, text: "Pay with UPI or Cash on Delivery" },
              { icon: Truck, text: "Delivered to your address after we confirm the order" },
            ].map(({ icon: I, text }) => (
              <li key={text} className="flex items-center gap-3">
                <I className="size-5 shrink-0 text-primary" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="mt-16" aria-labelledby="related">
        <h2 id="related" className="font-heading text-2xl font-bold tracking-tight">You may also like</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </main>
  );
}