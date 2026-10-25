"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Loader2, LogOut, Moon, Package, Settings, Sun, UserRound, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMounted } from "@/lib/use-mounted";
import { useAuth } from "./auth-provider";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.5 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.8V6.5H1.4a12 12 0 0 0 0 10.9l4-3z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function Avatar({ src, name, className }: { src: string | null; name: string; className: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" referrerPolicy="no-referrer" className={`${className} rounded-full object-cover`} />
  ) : (
    <span className={`${className} grid place-items-center rounded-full bg-brand font-bold text-brand-foreground`} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AuthButton() {
  const { user, loading, signingIn, signIn, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = mounted && resolvedTheme === "dark";

  if (loading) {
    return <div className="ml-1 size-9 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (!user) {
    return (
      <Button variant="outline" size="sm" className="ml-1 gap-2" onClick={signIn} disabled={signingIn}>
        {signingIn ? <Loader2 className="animate-spin" aria-hidden /> : <GoogleMark />}
        {signingIn ? "Signing in..." : "Sign in"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="ml-1 rounded-full outline-none ring-1 ring-border transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 data-[popup-open]:ring-2 data-[popup-open]:ring-primary/40"
      >
        <Avatar src={user.photoUrl} name={user.name} className="size-9" />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-muted/60 p-3">
          <Avatar src={user.photoUrl} name={user.name} className="size-10 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <DropdownMenuCheckboxItem
          checked={isDark}
          onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
        >
          {isDark ? <Moon aria-hidden /> : <Sun aria-hidden />}
          <span className="flex-1">Dark mode</span>
          <span
            aria-hidden
            className={`relative h-5 w-9 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-input"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-background shadow transition-transform ${isDark ? "translate-x-4" : ""}`}
            />
          </span>
        </DropdownMenuCheckboxItem>

        <DropdownMenuItem render={<Link href="/orders" />}>
          <Package aria-hidden /> My orders
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserRound aria-hidden /> Profile
        </DropdownMenuItem>
        {user.role === "ADMIN" && (
          <DropdownMenuItem render={<Link href="/admin/products/new" />}>
            <PlusSquare aria-hidden /> Add product
          </DropdownMenuItem>
        )}
        {/* <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings aria-hidden /> Settings
        </DropdownMenuItem> */}

        <DropdownMenuSeparator />

        <DropdownMenuItem destructive onClick={signOut}>
          <LogOut aria-hidden /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}