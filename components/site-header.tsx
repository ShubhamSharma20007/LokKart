import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AuthButton } from "./auth-button";
import { CartLink } from "./cart-links";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-heading flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid size-7 place-items-center rounded-md bg-primary text-sm text-primary-foreground">B</span>
          Bachatnix
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm">
          <Link href="/products" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>Products</Link>
          <ThemeToggle />
          <CartLink />
          <AuthButton />
        </nav>
      </div>
    </header>
  );
}