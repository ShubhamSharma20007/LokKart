"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/imagekit-server";

export type AdminProduct = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  imageUrl: string | null;
  imageFileId: string | null;
  createdAt: string;
};

export type AdminListResult =
  | { ok: true; products: AdminProduct[]; total: number; page: number; totalPages: number }
  | { ok: false; message: string };

// Admin: every product, newest first.
export async function listAdminProducts(idToken: string, page = 1, pageSize = 10): Promise<AdminListResult> {
  try {
    await requireAdmin(idToken);
  } catch {
    return { ok: false, message: "Only admins can view this list." };
  }

  try {
    const size = Math.min(Math.max(Math.floor(pageSize) || 10, 1), 50);
    const total = await prisma.product.count();
    const totalPages = Math.max(1, Math.ceil(total / size));
    const current = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);

    const rows = await prisma.product.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (current - 1) * size,
      take: size,
      select: {
        id: true, title: true, description: true, category: true,
        price: true, mrp: true, stock: true, imageUrl: true, imageFileId: true, createdAt: true,
      },
    });

    return {
      ok: true,
      products: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      total,
      page: current,
      totalPages,
    };
  } catch (err) {
    console.error("listAdminProducts failed", err);
    return { ok: false, message: "We could not load the products. Please try again." };
  }
}