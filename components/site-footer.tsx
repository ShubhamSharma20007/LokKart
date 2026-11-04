import Link from "next/link";
import { Mail } from "lucide-react";
import { PaymentBadges } from "./payment-badges";

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
    </svg>
  );
}

export async function SiteFooter() {
  const supportEmail = process.env.GMAIL_USER || "bachatnix@gmail.com";

  return (
    <footer className="relative mt-24">
      {/* ── Floating Newsletter Banner (Matches Shop.co Figma) ── */}
      {/* <div className="mx-auto max-w-6xl px-4 relative z-20 -mb-24">
        <div className="bg-black text-white rounded-[20px] px-6 py-8 sm:px-12 sm:py-10 md:px-16 md:py-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl font-black uppercase leading-tight max-w-md text-center md:text-left">
            STAY UPTO DATE ABOUT OUR LATEST OFFERS
          </h2>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-black">
              <Mail className="size-5 shrink-0 text-black/40" />
              <input
                type="email"
                placeholder="Enter your email address"
                className="w-full bg-transparent text-sm text-black placeholder:text-black/40 outline-none"
                aria-label="Email address"
              />
            </div>
            <button
              type="button"
              className="w-full rounded-full bg-white py-3 text-sm font-bold text-black hover:bg-white/90 transition-opacity"
            >
              Subscribe to Newsletter
            </button>
          </div>
        </div>
      </div> */}

      {/* ── Main Footer Body (Soft light grey #F0F0F0) ── */}
      <div className="bg-[#F0F0F0] pt-36 pb-10 text-black">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
            {/* Column 1: Brand */}
            <div className="space-y-4">
              <Link href="/" className="font-heading text-3xl font-black tracking-tight text-black inline-block">
                Bachat<span className="text-signal">nix</span>
              </Link>
              <p className="text-sm text-black/60 leading-relaxed max-w-[220px]">
                We have clothes that suits your style and which you&apos;re proud to wear. From women to men.
              </p>
            </div>

            {/* Column 2: COMPANY */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-black">Company</p>
              <ul className="space-y-2.5 text-sm text-black/60">
                <li><Link href="/about" className="hover:text-black transition-colors">About</Link></li>
                <li><Link href="/products" className="hover:text-black transition-colors">Features</Link></li>
                <li><Link href="/products" className="hover:text-black transition-colors">Works</Link></li>
              </ul>
            </div>

            {/* Column 3: HELP */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-black">Help</p>
              <ul className="space-y-2.5 text-sm text-black/60">
                <li><a href={`mailto:${supportEmail}`} className="hover:text-black transition-colors">Customer Support</a></li>
                <li><Link href="/orders" className="hover:text-black transition-colors">Delivery Details</Link></li>
                <li><Link href="/terms" className="hover:text-black transition-colors">Terms &amp; Conditions</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-black transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Column 4: FAQ */}
            <div className="space-y-3">
              <p className="text-xs sm:text-sm font-bold uppercase tracking-widest text-black">FAQ</p>
              <ul className="space-y-2.5 text-sm text-black/60">
                <li><Link href="/profile" className="hover:text-black transition-colors">Account</Link></li>
                <li><Link href="/orders" className="hover:text-black transition-colors">Manage Deliveries</Link></li>
                <li><Link href="/orders" className="hover:text-black transition-colors">Orders</Link></li>
                <li><Link href="/orders" className="hover:text-black transition-colors">Payments</Link></li>
              </ul>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-12 border-t border-black/10 pt-6 flex flex-wrap items-center justify-between gap-4 text-xs text-black/60">
            <p>
              Bachatnix &copy; 2000-2026, All Rights Reserved
            </p>
            {/* Payment badge icons */}
            <PaymentBadges />
          </div>
        </div>
      </div>
    </footer>
  );
}
