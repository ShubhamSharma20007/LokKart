"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, ShoppingCart, User, X, Menu } from "lucide-react";
import { useAuth } from "./auth-provider";
import { AuthButton } from "./auth-button";
import { CartLink } from "./cart-links";
import { HeaderSearch } from "./header-search";
import { auth } from "@/hooks/useFirebaseAuth";
import { checkFirstOrderEligibility } from "@/lib/order-actions";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "On Sale", href: "/products" },
  { label: "New Arrivals", href: "#new-arrivals" },
  { label: "Brands", href: "/products" },
];

export function SiteHeader() {
  const { user, signIn } = useAuth();
  const [showBanner, setShowBanner] = useState(true);
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsEligible(true);
      return;
    }
    let cancelled = false;
    async function checkEligibility() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await checkFirstOrderEligibility(token);
        if (!cancelled) {
          setIsEligible(res.isFirstOrder);
        }
      } catch {
        if (!cancelled) setIsEligible(false);
      }
    }
    void checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // If user has already placed an order (isEligible === false), do NOT show the 20% banner!
  const displayBanner = showBanner && isEligible !== false;

  return (
    <header className="sticky top-0 z-30 bg-white">
      {/* ── Top Announcement Bar (Black strip matching Figma) ── */}
      {displayBanner && (
        <div className="relative bg-black text-white text-xs sm:text-sm py-2 px-4 text-center">
          <p className="inline-block font-normal">
            {!user ? (
              <>
                Sign up and use code <strong className="font-bold underline">WELCOME20</strong> to get 20% off your first order.{" "}
                <button
                  type="button"
                  onClick={() => void signIn()}
                  className="font-semibold underline underline-offset-4 hover:text-white/80 transition-colors ml-1 cursor-pointer"
                >
                  Sign Up Now
                </button>
              </>
            ) : (
              <>
                Use code <strong className="font-bold underline">WELCOME20</strong> to get 20% off your first order!{" "}
                <Link
                  href="/products"
                  className="font-semibold underline underline-offset-4 hover:text-white/80 transition-colors ml-1"
                >
                  Shop Now
                </Link>
              </>
            )}
          </p>
          <button
            type="button"
            aria-label="Close promotion banner"
            onClick={() => setShowBanner(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/70 hover:text-white transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── Main Navbar ── */}
      <div className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-6 px-4 h-16 sm:h-20">
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden grid size-9 place-items-center rounded-full hover:bg-gray-100 text-black transition-colors shrink-0"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>

          {/* Logo */}
          <Link
            href="/"
            className="font-heading shrink-0 text-2xl sm:text-3xl font-black tracking-tight text-black flex items-center"
          >
            Bachat<span className="text-signal">nix</span>
          </Link>

          {/* Desktop nav links */}
          <nav aria-label="Main" className="hidden md:flex items-center gap-6 ml-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="text-sm font-medium text-black/80 hover:text-black transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Search — rounded pill with grey bg */}
          <div className="hidden md:flex flex-1 max-w-lg mx-auto">
            <div className="w-full">
              <HeaderSearch />
            </div>
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            {/* Mobile search toggle icon */}
            <button
              type="button"
              aria-label="Toggle search"
              onClick={() => setShowMobileSearch((s) => !s)}
              className="md:hidden grid size-9 place-items-center rounded-full hover:bg-gray-100 text-black transition-colors"
            >
              <Search className="size-5" />
            </button>

            <CartLink />
            <AuthButton />
          </div>
        </div>

        {/* Mobile expandable search row */}
        {showMobileSearch && (
          <div className="md:hidden border-t border-black/5 px-4 py-3 bg-white">
            <HeaderSearch />
          </div>
        )}
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-b border-black/10 bg-white px-4 py-3 space-y-1 shadow-lg"
        >
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-base font-semibold text-black/80",
                "hover:bg-gray-50 hover:text-black transition-colors"
              )}
            >
              <span>{l.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
