import Link from "next/link";
import { BadgeCheck, ShieldCheck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Catalog } from "@/components/catalog";
import { cn } from "@/lib/utils";
import { discountPct, formatINR, products } from "@/lib/products";

const steps = [
  { title: "Pick a product", body: "Every product shows the MRP, our price and what is in stock." },
  { title: "Add to cart", body: "Change quantities in your cart and review the total." },
  { title: "Pay your way", body: "Pay with UPI, or pay Cash on Delivery when it arrives." },
];

export default function Home() {
  const sample = products[0];
  return (
    <main>
      <section className="relative overflow-hidden border-b bg-primary text-primary-foreground">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
          <div>
            <h1 className="font-heading max-w-xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Shop smart, <span className="text-signal">save more.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-primary-foreground/75">
              Garments, footwear, electronics and industrial parts at prices well below MRP. Pay by UPI or Cash on Delivery.
            </p>
            <div className="mt-8">
              <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "h-11 bg-signal px-5 text-base text-signal-foreground hover:bg-signal/85")}>
                Browse products
              </Link>
            </div>
          </div>

          <Link href={`/products/${sample.id}`} className="block text-foreground md:rotate-1" aria-label={`View ${sample.title}`}>
            <Card className="border-2 border-dashed border-primary/40 shadow-xl transition-transform hover:rotate-0">
              <div className="flex justify-center">
                <span className="size-3 rounded-full bg-muted ring-2 ring-primary/40" aria-hidden />
              </div>
              <CardContent className="space-y-4">
                <Badge variant="secondary">{sample.category}</Badge>
                <p className="font-heading text-lg font-semibold leading-snug">{sample.title}</p>
                <Separator />
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground line-through">MRP {formatINR(sample.mrp)}</p>
                    <p className="font-heading text-4xl font-bold">{formatINR(sample.price)}</p>
                  </div>
                  <Badge className="bg-signal px-3 py-1 text-base text-signal-foreground">{discountPct(sample)}% off</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <section className="border-b bg-muted/40">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-sm sm:grid-cols-3">
          {[
            { icon: BadgeCheck, title: "Clear pricing", body: "MRP and our price side by side on every product." },
            { icon: ShieldCheck, title: "Condition stated", body: "Each product says if it is new, boxed or has packaging damage." },
            { icon: Wallet, title: "Pay your way", body: "UPI or Cash on Delivery at checkout." },
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

      <Catalog products={products} heading="Latest products" />

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="font-heading grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">{i + 1}</span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}