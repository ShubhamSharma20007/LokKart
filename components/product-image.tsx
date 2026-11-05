import { categoryIcons } from "@/components/category-icon";
import { imageSrc } from "@/lib/product-image";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// The product photo, or the category icon when the product has no image.
// Fills its parent, so the parent decides the size and shape.
export function ProductImage({
  product,
  width,
  eager = false,
  className,
  iconClassName,
}: {
  product: Pick<StoreProduct, "title" | "category" | "imageUrl">;
  width: number;
  eager?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  if (product.imageUrl) {
    const smallWidth = Math.max(160, Math.round(width * 0.5));
    const midWidth = width;
    const largeWidth = Math.round(width * 1.5);

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageSrc(product.imageUrl, midWidth)}
        srcSet={`${imageSrc(product.imageUrl, smallWidth)} ${smallWidth}w, ${imageSrc(product.imageUrl, midWidth)} ${midWidth}w, ${imageSrc(product.imageUrl, largeWidth)} ${largeWidth}w`}
        sizes="(max-width: 640px) 180px, (max-width: 1024px) 260px, 360px"
        alt={product.title}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={cn("size-full object-contain", className)}
      />
    );
  }
  const Icon = categoryIcons[product.category];
  return <Icon className={iconClassName} aria-hidden />;
}
