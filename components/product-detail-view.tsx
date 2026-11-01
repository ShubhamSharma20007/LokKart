"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Check, ShoppingCart, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StockBadge } from "@/components/stock-badge";
import { ProductGallery } from "@/components/product-gallery";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addItem } from "@/lib/store/slices/cartSlice";
import { formatINR, getColorHex } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

export function ProductDetailView({ product }: { product: StoreProduct }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const mounted = useMounted();

  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const hasColors = !!product.colors && product.colors.length > 0;

  // Selected state
  const [selectedSize, setSelectedSize] = useState<string | null>(
    hasSizes ? product.sizes[0] : null
  );
  const [selectedColor, setSelectedColor] = useState<string | null>(
    hasColors ? product.colors[0] : null
  );

  // Active gallery image index
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Switch image when color changes if product has multiple images
  const handleColorChange = (colorName: string, index: number) => {
    setSelectedColor(colorName);
    const imagesCount = product.images?.length || (product.imageUrl ? 1 : 0);
    if (imagesCount > 1 && index < imagesCount) {
      setActiveImageIndex(index);
    }
  };

  const cartItemId = `${product.id}${selectedColor ? `-${selectedColor}` : ""}${
    selectedSize ? `-${selectedSize}` : ""
  }`;

  const inCart = useAppSelector((s) => s.cart.items.find((i) => i.id === cartItemId));

  const handleAddToCart = (isBuyNow = false) => {
    if (product.stock < 1) {
      toast.error("This product is currently out of stock");
      return;
    }

    if (hasColors && !selectedColor) {
      toast.error("Please select a color");
      return;
    }

    if (hasSizes && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (inCart && inCart.qty >= product.stock && !isBuyNow) {
      toast.info("You have all available stock in your cart.", { id: `max-${product.id}` });
      return;
    }

    dispatch(
      addItem({
        id: cartItemId,
        productId: product.id,
        title: product.title,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        color: selectedColor || undefined,
        size: selectedSize || undefined,
      })
    );

    if (isBuyNow) {
      router.push("/checkout");
    } else {
      const variantDesc = [
        selectedColor ? `Color: ${selectedColor}` : null,
        selectedSize ? `Size: ${selectedSize}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      toast.success(variantDesc ? `Added to cart (${variantDesc})` : "Added to cart", {
        id: `add-${cartItemId}`,
        description: product.title,
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
    }
  };

  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[400px_1fr] lg:grid-cols-[440px_1fr] lg:gap-12 items-start">
      {/* Interactive Multi-Image Gallery with Color-Sync */}
      <ProductGallery
        product={product}
        activeIndex={activeImageIndex}
        onIndexChange={setActiveImageIndex}
      />

      {/* Product Details & Variant Selectors */}
      <div className="space-y-5">
        <div className="space-y-2">
          <Badge variant="secondary" className="text-xs px-2.5 py-0.5">
            {product.category}
          </Badge>
          <h1 className="font-heading text-xl font-bold leading-snug tracking-tight sm:text-2xl text-foreground">
            {product.title}
          </h1>
          {product.description && (
            <p className="max-w-prose text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-4 sm:p-5 shadow-xs">
          {/* Price Header */}
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {formatINR(product.price)}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground line-through font-medium">
              MRP {formatINR(product.mrp)}
            </span>
            {product.mrp > product.price && (
              <span className="ml-auto rounded-md bg-[#fcc618] px-2 py-0.5 text-xs font-bold text-black shadow-xs">
                Save {formatINR(product.mrp - product.price)}
              </span>
            )}
          </div>

          <div>
            <StockBadge stock={product.stock} />
          </div>

          {/* Color Selection Swatches */}
          {hasColors && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Color:{" "}
                  <strong className="text-primary font-bold">
                    {selectedColor || "Select a color"}
                  </strong>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {product.colors.length} {product.colors.length === 1 ? "shade" : "shades"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.colors.map((c, idx) => {
                  const isSelected = selectedColor === c;
                  const hex = getColorHex(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleColorChange(c, idx)}
                      className={cn(
                        "flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-semibold transition-all border select-none",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 shadow-xs scale-102"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground"
                      )}
                    >
                      <span
                        className="size-3.5 rounded-full border border-black/20 shadow-2xs shrink-0"
                        style={{ backgroundColor: hex }}
                      />
                      <span>{c}</span>
                      {isSelected && <Check className="size-3.5 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selection Pills */}
          {hasSizes && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Size:{" "}
                  <strong className="text-primary font-bold">
                    {selectedSize || "Select a size"}
                  </strong>
                </span>
                <span className="text-[11px] text-muted-foreground">Standard fit</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const isSelected = selectedSize === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={cn(
                        "h-9 min-w-11 px-3 rounded-lg text-xs font-bold transition-all border select-none",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs scale-102"
                          : "border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2">
            {product.stock < 1 ? (
              <Button disabled className="h-10 w-full opacity-60">
                Out of stock
              </Button>
            ) : (
              <div className="flex w-full gap-2.5">
                <Button
                  onClick={() => handleAddToCart(false)}
                  variant="outline"
                  className="flex-1 h-10 font-semibold gap-1.5"
                >
                  <ShoppingCart className="size-4" aria-hidden />
                  {mounted && inCart ? `In cart (${inCart.qty})` : "Add to cart"}
                </Button>
                <Button
                  onClick={() => handleAddToCart(true)}
                  className="flex-1 h-10 font-semibold"
                >
                  Buy now
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* E-Commerce Trust Badges */}
        <ul className="space-y-2.5 rounded-xl border border-border/40 bg-muted/20 p-4 text-xs sm:text-sm">
          {[
            { icon: BadgeCheck, text: "MRP and our price shown side by side" },
            { icon: Wallet, text: "Pay with UPI or Cash on Delivery" },
            { icon: Truck, text: "100% Free Shipping on all orders" },
          ].map(({ icon: I, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-muted-foreground">
              <I className="size-4 shrink-0 text-primary" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

