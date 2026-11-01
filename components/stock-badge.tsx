import { Badge } from "@/components/ui/badge";

export function StockBadge({ stock }: { stock: number }) {
  if (stock < 1) {
    return <Badge variant="destructive">Out of stock</Badge>;
  }
  if (stock <= 5) {
    return (
      <Badge variant="signal" className="font-bold">
        Only {stock} left in stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold gap-1.5"
    >
      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
      In stock
    </Badge>
  );
}
