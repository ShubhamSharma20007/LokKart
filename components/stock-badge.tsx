import { Badge } from "@/components/ui/badge";

export function StockBadge({ stock }: { stock: number }) {
  if (stock < 1) return <Badge variant="destructive">Out of stock</Badge>;
  if (stock <= 20) return <Badge variant="signal">Only {stock} left</Badge>;
  return <Badge variant="secondary">{stock.toLocaleString("en-IN")} in stock</Badge>;
}