
import Link from "next/link";
import { Headphones, Mail, PackageSearch, Clock } from "lucide-react";
import { categories } from "@/lib/products";

const link = "text-brand-foreground/70 transition-colors hover:text-brand-foreground";

export  async function SiteFooter() {
  "use cache"
  const supportEmail = process.env.GMAIL_USER || "bachatnix@gmail.com";

  return (
    <footer className="mt-16 bg-brand text-brand-foreground">
      {/* Minimal Top Helpdesk Strip */}
      <div className="border-b border-white/10 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-signal">
              <Headphones className="size-4" />
            </span>
            <div>
              <p className="font-semibold text-brand-foreground">Need help with an order or product?</p>
              <p className="text-xs text-brand-foreground/70">Our support team typically responds within 24 hours.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`mailto:${supportEmail}?subject=Support%20Inquiry%20-%20Bachatnix`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-white transition-colors hover:bg-white/20"
            >
              <Mail className="size-3.5 text-signal" />
              {supportEmail}
            </a>
            <Link
              href="/orders"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/10"
            >
              <PackageSearch className="size-3.5" />
              Track Order
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
        {/* Brand */}
        <div className="space-y-3">
          <p className="font-heading text-xl font-extrabold tracking-tight">
            Bachat<span className="text-signal">nix</span>
          </p>
          <p className="max-w-xs text-xs sm:text-sm text-brand-foreground/70 leading-relaxed">
            Good products at prices that save you money. MRP and our discount price shown clearly on every single item.
          </p>
        </div>

        {/* Shop */}
        <nav aria-label="Shop" className="space-y-3 text-sm">
          <p className="font-semibold text-brand-foreground">Shop</p>
          <ul className="space-y-2 text-xs sm:text-sm">
            <li><Link className={link} href="/products">All products</Link></li>
            {categories.map((c) => (
              <li key={c}>
                <Link className={link} href={`/products?category=${encodeURIComponent(c)}`}>{c}</Link>
              </li>
            ))}
            <li><Link className={link} href="/cart">Your cart</Link></li>
          </ul>
        </nav>

        {/* Payment & Trust */}
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-brand-foreground">Payment &amp; Trust</p>
          <ul className="space-y-2 text-xs sm:text-sm text-brand-foreground/70">
            <li>Cash on Delivery (COD)</li>
            <li>UPI (GPay / PhonePe / Paytm)</li>
            <li>Secured by Cashfree Payments</li>
            <li>100% Buyer Protection</li>
          </ul>
        </div>

        {/* Customer Support */}
        <div className="space-y-3 text-sm">
          <p className="font-semibold text-brand-foreground">Customer Support</p>
          <ul className="space-y-2 text-xs sm:text-sm text-brand-foreground/70">
            <li>
              <a
                href={`mailto:${supportEmail}?subject=Support%20Inquiry%20-%20Bachatnix`}
                className="font-medium text-white transition-colors hover:text-signal"
              >
                {supportEmail}
              </a>
            </li>
            <li>
              <Link className={link} href="/orders">Track Your Order</Link>
            </li>
            <li className="flex items-center gap-1.5 pt-1 text-[11px] text-brand-foreground/60">
              <Clock className="size-3 shrink-0" />
              <span>Mon &ndash; Sat: 9:00 AM &ndash; 7:00 PM IST</span>
            </li>
            <li className="text-[11px] text-brand-foreground/50">
              Closed on Public Holidays
            </li>
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-brand-foreground/60">
          &copy; {new Date().getFullYear()} Bachat<span className="text-signal">nix</span>. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
