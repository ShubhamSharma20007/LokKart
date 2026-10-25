"use client";

import Link from "next/link";
import { AuthButton } from "./auth-button";
import { CartLink } from "./cart-links";
import { HeaderSearch } from "./header-search";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "./auth-provider";

export function SiteHeader() {
  const {user} = useAuth()
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      {/* Phones: logo and cart on the first row, search on its own row below. */}
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 md:h-14 md:flex-nowrap md:py-0">
        <Link href="/" className="font-heading flex shrink-0 items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-brand text-sm text-brand-foreground">B</span>
          Bachatnix
        </Link>
        <div className="order-last w-full md:order-none md:max-w-xl md:flex-1">
          <HeaderSearch />
        </div>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          {/* <Link href="/products" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Products</Link> */}
        { !user &&  <ThemeToggle />}
          <CartLink />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}