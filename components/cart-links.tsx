"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useAppSelector } from "@/lib/store/hooks";
import { selectCount } from "@/lib/store/slices/cartSlice";
import { useMounted } from "@/lib/use-mounted";

export function CartLink() {
  const count = useAppSelector(selectCount);
  const mounted = useMounted();
  const displayCount = mounted ? count : 0;

  return (
    <Link
      href="/cart"
      className="relative grid size-9 sm:size-10 place-items-center rounded-full hover:bg-gray-100 text-black transition-colors"
      aria-label={`Cart, ${displayCount} items`}
    >
      <ShoppingCart className="size-5 sm:size-[22px]" aria-hidden />
      {displayCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-black text-[#FFC633] px-1 text-[10px] font-bold shadow-xs">
          {displayCount}
        </span>
      )}
    </Link>
  );
}
