import Link from "next/link";
import { categories } from "@/lib/products";

const link = "text-brand-foreground/70 transition-colors hover:text-brand-foreground";

export function SiteFooter() {
  const supportEmail = process.env.GMAIL_USER || "bachatnix@gmail.com";

  return (
    <footer className="mt-16 bg-brand text-brand-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <p className="font-heading text-xl font-extrabold tracking-tight">Bachat<span className="text-signal">nix</span></p>
          <p className="max-w-xs text-sm text-brand-foreground/70">
            Good products at prices that save you money. MRP and price shown on every item.
          </p>
        </div>

        {/* Shop */}
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

        {/* Payment */}
        <div className="space-y-3 text-sm">
          <p className="font-medium">Payment</p>
          <ul className="space-y-2 text-brand-foreground/70">
            <li>Cash on Delivery</li>
            <li>UPI (GPay / PhonePe / Paytm)</li>
            <li>Secured by Cashfree</li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="space-y-3 text-sm">
          <p className="font-medium">Customer Support</p>
          <ul className="space-y-2 text-brand-foreground/70">
            <li>
              <a href={`mailto:${supportEmail}?subject=Support%20Inquiry%20-%20Bachatnix`} className="hover:text-signal transition-colors font-medium">
                {supportEmail}
              </a>
            </li>
            <li><Link className={link} href="/orders">Track Your Order</Link></li>
            <li className="text-xs text-brand-foreground/50">Mon &ndash; Sat (9 AM &ndash; 7 PM)</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-brand-foreground/60">© 2026 Bachat<span className="text-signal">nix</span></p>
      </div>
    </footer>
  );
}
