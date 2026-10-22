import { Cpu, Footprints, Shirt, Wrench } from "lucide-react";
import type { Category } from "@/lib/products";

export const categoryIcons: Record<Category, typeof Shirt> = {
  Garments: Shirt,
  Footwear: Footprints,
  Electronics: Cpu,
  "Industrial parts": Wrench,
};