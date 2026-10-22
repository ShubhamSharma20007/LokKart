import Link from "next/link";
import { categories } from "@/lib/products";

const link = "text-primary-foreground/70 transition-colors hover:text-primary-foreground";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-3">
        <div className="space-y-3">
          <p className="font-heading text-xl font-extrabold tracking-tight">Bachatnix</p>
          <p className="max-w-xs text-sm text-primary-foreground/70">
            Good products at prices that save you money. MRP and price shown on every item.
          </p>
        </div>
        <nav aria-label="Shop" className="space-y-3 text-sm">
          <p className="font-medium">Shop</p>
          <ul className="space-y-2">
            <li><Link className={link} href="/products">All products</Link></li>
            {categories.map((c) => (
              <li key={c}><Link className={link} href={`/products?category=${encodeURIComponent(c)}`}>{c}</Link></li>
            ))}
            <li><Link className={link} href="/cart">Your cart</Link></li>
          </ul>
        </nav>
        <div className="space-y-3 text-sm">
          <p className="font-medium">Payment</p>
          <ul className="space-y-2 text-primary-foreground/70">
            <li>Cash on Delivery</li>
            <li>UPI</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-primary-foreground/60">© 2026 Bachatnix</p>
      </div>
    </footer>
  );
}