import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AddToCart } from "@/components/add-to-cart";
import { categoryIcons } from "@/components/category-icon";
import { StockBadge } from "./stock-badge";
import { cn } from "@/lib/utils";
import { discountPct, formatINR, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const Icon = categoryIcons[product.category];
  const href = `/products/${product.id}`;
  return (
    <Card className="group gap-3 pt-0 transition-shadow hover:shadow-lg">
      <Link href={href} aria-label={product.title} tabIndex={-1} className="block">
        <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/[0.03] text-primary/60">
          <Icon className="size-14 transition-transform group-hover:scale-110" aria-hidden />
          <Badge variant="signal" className="absolute top-3 right-3 h-6 px-2.5 text-sm font-bold">
            {discountPct(product)}% off
          </Badge>
          <Badge variant="secondary" className="absolute top-3 left-3">{product.category}</Badge>
        </div>
      </Link>
      <CardHeader>
        <CardTitle className="line-clamp-2 min-h-10 text-base leading-snug">
          <Link href={href} className="hover:underline">{product.title}</Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="flex items-baseline gap-2">
          <span className="font-heading text-3xl font-extrabold tracking-tight">{formatINR(product.price)}</span>
          <span className="ml-auto text-sm text-muted-foreground line-through">{formatINR(product.mrp)}</span>
        </p>
        <StockBadge stock={product.stock} />
      </CardContent>
      <CardFooter className="gap-2">
        <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "h-9")}>Details</Link>
        <AddToCart product={product} />
      </CardFooter>
    </Card>
  );
}