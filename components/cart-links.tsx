"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCount } from "@/lib/store/slices/cartSlice";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

export function CartLink() {
  const count = useAppSelector(selectCount);
  const mounted = useMounted();

  const displayCount = mounted ? count : 0;

  return (
    <Link
      href="/cart"
      className={cn(buttonVariants({ size: "sm" }), "ml-1 gap-1.5")}
      aria-label={`Cart, ${displayCount} items`}
    >
      <ShoppingCart aria-hidden />
      Cart
      {displayCount > 0 && (
        <Badge variant="signal" className="h-5 min-w-5 px-1.5 font-bold" aria-hidden>
          {displayCount}
        </Badge>
      )}
    </Link>
  );
}